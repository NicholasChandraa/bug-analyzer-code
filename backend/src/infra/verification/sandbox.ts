import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getErrorMessage } from "../../utils/error.js";

/** Mengubah `execFile` berbasis callback menjadi berbasis Promise agar dapat di-`await` secara async */
const execFileAsync = promisify(execFile)

/** Batas waktu maksimal eksekusi perintah di dalam container (5 menit - install bisa lebih lama dari sekadar tsc) */
const TIMEOUT_MS = 5 * 60 * 1000

/** Batas maksimal ukuran buffer output terminal (10 MB) */
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024

/** Image Docker resmi yang dipakai buat sandbox - dipilih apa adanya, gak perlu Dockerfile custom */
const SANDBOX_IMAGE = "node:20-slim"

/**
 * corepack itu bawaan Node >=16.9 tapi shim pnpm-nya harus diaktifin manual dulu -
 * dan ini harus diulang di SETIAP `docker run` karena filesystem image-nya fresh
 * lagi tiap container baru (yang persisten cuma folder repo yang di-mount).
 */
const PREPARE_PNPM = "corepack enable && corepack prepare pnpm@latest --activate"

/**
 * Hasil keluaran dari eksekusi perintah di dalam sandbox.
 */
export interface CommandResult {
    /** Menandakan apakah perintah berhasil dijalankan (exit code 0) */
    passed: boolean
    /** Gabungan teks output stdout dan stderr dari terminal */
    output: string
}

/**
 * Install dependencies (`pnpm install`) repositori target DI DALAM sandbox, bukan di host.
 * Ini titik paling rawan buat postinstall script yang jahat - jadi network diizinkan disini
 * (wajib buat akses registry npm), tapi filesystem yang bisa disentuh tetep dibatasin cuma
 * folder repo itu doang lewat mount, jadi gak bisa nyentuh host atau repo lain.
 *
 * Dipanggil sekali per sync (bukan per tool call triage) - hasil `node_modules`-nya numpuk
 * normal di disk repo itu (mount-nya read-write) biar tsc/lint/test gak perlu install ulang.
 */
export async function installDependencies(repoPath: string): Promise<CommandResult> {
    return runInSandbox(repoPath, `${PREPARE_PNPM} && pnpm install`, { allowNetwork: true })
}

/**
 * Menjalankan `npx tsc --noEmit` di dalam sandbox (tanpa network - tsc gak butuh internet).
 * Dipakai buat memverifikasi 0 error tipe data/sintaks TypeScript pada repositori.
 */
export async function runTypeCheck(repoPath: string): Promise<CommandResult> {
    return runInSandbox(repoPath, "npx tsc --noEmit", { allowNetwork: false })
}

/**
 * Menjalankan skrip "lint" lalu "test" milik repositori target (via pnpm) kalau ada di
 * package.json, di dalam sandbox tanpa network. Lint & test digabung satu shell command
 * (`&&`) - kalau lint gagal, test gak usah dijalanin (hemat waktu container).
 */
export async function runLinterAndTests(repoPath: string): Promise<CommandResult> {
    const scripts = await getPackageScripts(repoPath)
    const commands: string[] = []

    if (scripts.lint) commands.push("pnpm run lint")
    if (scripts.test) commands.push("pnpm test")

    if (commands.length === 0) {
        return { passed: true, output: "Tidak ditemukan skrip lint atau test di package.json - dilewati." }
    }

    return runInSandbox(repoPath, `${PREPARE_PNPM} && ${commands.join(" && ")}`, { allowNetwork: false })
}

/**
 * Membaca skrip yang terdefinisi pada file `package.json` di root repositori target.
 * Ini dibaca dari HOST (bukan dari dalam container) - cuma buat nentuin command apa yang
 * mau dijalanin, bukan eksekusi kode apapun, jadi aman dilakuin di luar sandbox.
 */
async function getPackageScripts(repoPath: string): Promise<Record<string, string>> {
    try {
        const raw = await readFile(path.join(repoPath, "package.json"), "utf-8")
        return JSON.parse(raw).scripts ?? {}
    } catch {
        return {}
    }
}

/**
 * Menjalankan satu shell command di dalam container Docker sekali-pakai (`--rm`), dengan
 * `repoPath` di-mount jadi working directory (`/repo`). Limit CPU/memory/pids dipasang biar
 * satu proses (jahat atau nyasar) gak bisa habisin resource host. `--network none` dipasang
 * kecuali `allowNetwork` true - defense utama-nya justru disini: kalaupun ada kode jahat yang
 * kejalanin, dia gak punya jalan buat exfiltrate data keluar container.
 *
 * Beda sama `command`/`args` di ripgrep.ts (yang argumennya untrusted), `docker` di panggil
 * sebagai executable native (bukan shim), jadi gak perlu `shell: true` disini.
 */
async function runInSandbox(
    repoPath: string,
    shellCommand: string,
    { allowNetwork }: { allowNetwork: boolean }
): Promise<CommandResult> {
    const args = [
        "run", "--rm",
        ...(allowNetwork ? [] : ["--network", "none"]),
        "--memory", "2g",
        "--cpus", "2",
        "--pids-limit", "256",
        "-v", `${repoPath}:/repo`,
        "-w", "/repo",
        SANDBOX_IMAGE,
        "sh", "-c", shellCommand,
    ]

    try {
        const { stdout, stderr } = await execFileAsync("docker", args, {
            timeout: TIMEOUT_MS,
            maxBuffer: MAX_OUTPUT_BYTES,
        })
        return { passed: true, output: stdout + stderr }
    } catch (error) {
        return { passed: false, output: getErrorMessage(error) }
    }
}
