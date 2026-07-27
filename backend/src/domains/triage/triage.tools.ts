import { tool, type ToolRuntime } from "@langchain/core/tools";
import { z } from "zod";
import path from "node:path"
import { readFile } from "node:fs/promises";
import { repositoryRepo, type RepositoryRow } from "../repository/repository.repo.js";
import { triageRepo } from "./triage.repo.js";
import { searchAcrossRepos } from "../../infra/code-search/ripgrep.js";
import { getFileBlame, getFileLog } from "../../infra/code-search/git-history.js";
import { runTypeCheck, runLinterAndTests } from "../../infra/verification/sandbox.js";
import { validatePathBoundary } from "../../infra/security/path-guard.js";
import { logger } from "../../utils/logger.js";

async function resolveRepo(slug: string): Promise<RepositoryRow> {
    const repo = await repositoryRepo.getRepositoryBySlug(slug)
    if (!repo) throw new Error(`Repository dengan slug "${slug}" belum terdaftar`)
    return repo
}

async function resolveRepoPath(slug: string): Promise<string> {
    logger.info({ slug }, "Memproses resolveRepoPath untuk slug")
    const repo = await resolveRepo(slug)
    return repo.localPath
}

/**
 * Mengonversi daftar `slugs` repositori menjadi daftar objek yang berisi `slug` dan `localPath`.
 * Jika `slugs` tidak diberikan (undefined), fungsi ini akan mengembalikan seluruh repositori yang terdaftar.
 * 
 * @param slugs - Array slug repositori yang opsional
 * @returns Array dari objek { slug, localPath }
 */
async function resolveRepoPaths(slugs?: string[]): Promise<{ slug: string; localPath: string }[]> {
    logger.info({ slugs }, "Memproses resolveRepoPaths untuk daftar slugs")

    const repos: (RepositoryRow | null)[] = (slugs && slugs.length > 0)
        ? await Promise.all(slugs.map((slug) => repositoryRepo.getRepositoryBySlug(slug)))
        : await repositoryRepo.listRepositories()

    return repos
        .filter((repo): repo is RepositoryRow => repo !== null)
        .map((repo) => ({ slug: repo.slug, localPath: repo.localPath }))
}

/**
 * Memastikan path file yang diminta oleh AI Agent aman dan tetap berada di dalam direktori repositori.
 * Digunakan untuk mencegah serangan keamanan Path Traversal (misal: `../../../etc/passwd`).
 * 
 * @param localPath - Root path direktori repositori lokal
 * @param filePath - Path file relatif yang diminta oleh agen
 * @returns Absolute path yang sudah diverifikasi aman
 * @throws Error jika path mencoba mengakses file di luar root repositori
 */
function resolveSafePath(localPath: string, filePath: string): string {
    return validatePathBoundary(filePath, localPath)
}

export const ripgrepSearchTool = tool(
    async ({ query, repoSlugs }: { query: string; repoSlugs?: string[] }) => {
        const repos = await resolveRepoPaths(repoSlugs)
        if (repos.length === 0) return "Tidak ada repositori terdaftar yang cocok."

        const matches = await searchAcrossRepos(query, repos.map((r) => r.localPath))
        if (matches.length === 0) return `Tidak ada hasil pencocokan untuk kata kunci "${query}"`

        const pathToSlug = new Map(repos.map((r) => [r.localPath, r.slug]))
        return matches
            .map((m) => `[${pathToSlug.get(m.repoPath) ?? m.repoPath}] ${m.filePath}:${m.lineNumber}: ${m.lineContent}`)
            .join("\n")
    },
    {
        name: "ripgrep_search",
        description: "Mencari kata kunci secara harfiah di dalam satu atau beberapa repositori terdaftar di disk. Kosongkan repoSlugs untuk mencari di semua repositori.",
        schema: z.object({
            query: z.string().describe("Kata kunci atau frasa yang ingin dicari secara harfiah"),
            repoSlugs: z.array(z.string()).optional().describe("Daftar slug repositori untuk membatasi ruang lingkup pencarian"),
        }),
    }
)

/**
 * Tool AI Agent: Membaca isi file (atau rentang baris tertentu) dari repositori di disk.
 */
export const readRepoFileTool = tool(
    async ({ repoSlug, filePath, startLine, endLine }: { repoSlug: string; filePath: string; startLine?: number; endLine?: number }) => {
        const localPath = await resolveRepoPath(repoSlug)
        const absolutePath = resolveSafePath(localPath, filePath)
        const content = await readFile(absolutePath, "utf-8")

        if (!startLine && !endLine) return content

        const lines = content.split("\n")
        const start = Math.max(1, startLine ?? 1)
        const end = Math.min(lines.length, endLine ?? lines.length)

        return lines.slice(start - 1, end).map((line, i) => `${start + i}: ${line}`).join("\n")
    },
    {
        name: "read_repo_file",
        description: "Membaca isi file (opsional berdasarkan rentang baris) dari repositori terdaftar di disk.",
        schema: z.object({
            repoSlug: z.string().describe("Slug repositori yang terdaftar"),
            filePath: z.string().describe("Path file relatif terhadap root repositori"),
            startLine: z.number().int().positive().optional().describe("Nomor baris awal (opsional)"),
            endLine: z.number().int().positive().optional().describe("Nomor baris akhir (opsional)"),
        }),
    }
)

/**
 * Tool AI Agent: Memeriksa riwayat commit file (mode=log) atau pembuat tiap baris kode (mode=blame).
 */
export const gitLogBlameTool = tool(
    async ({ repoSlug, filePath, mode }: { repoSlug: string; filePath: string; mode: "log" | "blame" }) => {
        const localPath = await resolveRepoPath(repoSlug)
        // filePath dari argumen tool (untrusted) - pakai guard yang sama kayak read_repo_file
        // biar gak bisa dipakai buat traversal keluar root repo.
        resolveSafePath(localPath, filePath)

        if (mode === "blame") {
            const lines = await getFileBlame(localPath, filePath)
            return lines.map((l) => `${l.lineNumber} (${l.hash.slice(0, 7)} ${l.author} ${l.date}): ${l.content}`).join("\n")
        }

        const entries = await getFileLog(localPath, filePath)
        return entries.map((e) => `${e.hash.slice(0, 7)} ${e.date} ${e.author}: ${e.message}`).join("\n")
    },
    {
        name: "git_log_blame",
        description: "Memeriksa riwayat commit (mode=log) atau pembuat per baris kode (mode=blame) pada file di repositori.",
        schema: z.object({
            repoSlug: z.string().describe("Slug repositori yang terdaftar"),
            filePath: z.string().describe("Path file relatif terhadap root repositori"),
            mode: z.enum(["log", "blame"]).describe("Mode pemeriksaan: 'log' untuk riwayat commit, 'blame' untuk riwayat pembuat baris"),
        })
    }
)

/**
 * Tool AI Agent: Melacak file mana saja yang meng-import atau menggunakan modul tertentu.
 */
export const traceDependenciesTool = tool(
    async ({ repoSlug, modulePath }: { repoSlug: string; modulePath: string }) => {
        const localPath = await resolveRepoPath(repoSlug)
        const matches = await searchAcrossRepos(modulePath, [localPath])

        if (matches.length === 0) return `Tidak ditemukan referensi import/export untuk "${modulePath}".`
        return matches.map((m) => `${m.filePath}:${m.lineNumber}: ${m.lineContent}`).join("\n")
    },
    {
        name: "trace_dependencies",
        description: "Mencari file yang meng-import atau membutuhkan modul/path relatif tertentu di dalam repositori.",
        schema: z.object({
            repoSlug: z.string().describe("Slug repositori yang terdaftar"),
            modulePath: z.string().describe("Spesifikasi modul atau path relatif import yang ingin dilacak"),
        }),
    }
)

/**
 * Tool AI Agent: Menjalankan `npx tsc --noEmit` untuk memverifikasi tidak ada error sintaks/tipe data TypeScript.
 */
export const tscNoEmitTool = tool(
    async ({ repoSlug }: { repoSlug: string }) => {
        const repo = await resolveRepo(repoSlug)
        const isLocalMode = repo.sourceType === "local"
        const result = await runTypeCheck(repo.localPath, isLocalMode)
        return result.passed ? "Pemeriksaan tipe data TypeScript berhasil dengan 0 error." : result.output
    },
    {
        name: "tsc_no_emit",
        description: "Menjalankan `npx tsc --noEmit` pada repositori terdaftar untuk memverifikasi 0 error tipe data TypeScript.",
        schema: z.object({ repoSlug: z.string().describe("Slug repositori yang terdaftar") }),
    }
)

/**
 * Tool AI Agent: Menjalankan skrip linter dan pengujian (test) milik repositori (via pnpm).
 */
export const runLinterAndTestsTool = tool(
    async ({ repoSlug }: { repoSlug: string }) => {
        const repo = await resolveRepo(repoSlug)
        const isLocalMode = repo.sourceType === "local"
        const result = await runLinterAndTests(repo.localPath, isLocalMode)
        return result.passed ? "Skrip linter dan pengujian (test) berhasil." : result.output
    },
    {
        name: "run_linter_and_tests",
        description: "Menjalankan skrip lint dan test milik repositori (via pnpm) dan melaporkan status kelulusan.",
        schema: z.object({ repoSlug: z.string().describe("Slug repositori yang terdaftar") }),
    }
)

/**
 * Tool AI Agent: Menyimpan hasil akhir triage sebagai bug report terverifikasi ke database.
 * Wajib dipanggil sekali sebagai aksi terakhir agent, setelah tsc_no_emit & run_linter_and_tests lolos.
 *
 * `chatSessionId` diambil dari `runtime.config.configurable.thread_id` (bukan dari argumen tool) -
 * thread_id itu yang di-set triage.service.ts jadi String(chatSessionId) saat agent.stream() dipanggil,
 * jadi agent gak perlu (dan gak boleh) nebak-nebak ID sesinya sendiri.
 */
export const submitBugReportTool = tool(
    async (
        { repoSlug, filePath, lineEstimate, reason, suggestedFix }: {
            repoSlug: string
            filePath: string
            lineEstimate?: string
            reason: string
            suggestedFix: string
        },
        runtime: ToolRuntime
    ) => {
        const chatSessionId = Number(runtime.config.configurable?.thread_id)
        if (!chatSessionId) throw new Error("thread_id tidak ditemukan di runtime config - gak bisa nyimpen bug report")

        const repo = await resolveRepo(repoSlug)
        resolveSafePath(repo.localPath, filePath)

        await triageRepo.createdBugReport({
            chatSessionId,
            repositoryId: repo.id,
            filePath,
            lineEstimate: lineEstimate ?? null,
            reason,
            suggestedFix,
        })

        return "Bug report berhasil disimpan."
    },
    {
        name: "submit_bug_report",
        description: "Panggil ini SEKALI sebagai aksi terakhir, setelah verifikasi (tsc_no_emit & run_linter_and_tests) lolos, untuk menyimpan perbaikan sebagai bug report terverifikasi.",
        schema: z.object({
            repoSlug: z.string().describe("Slug repositori yang terdampak"),
            filePath: z.string().describe("Path file utama yang diperbaiki"),
            lineEstimate: z.string().optional().describe("Perkiraan baris/rentang baris yang bermasalah, misal '42' atau '40-55'"),
            reason: z.string().describe("Penjelasan akar masalah (root cause)"),
            suggestedFix: z.string().describe("Unified diff patch atau deskripsi perbaikan kode"),
        }),
    }
)

/**
 * Kumpulan seluruh tools yang dimiliki oleh Triage AI Agent.
 */
export const triageTools = [
    ripgrepSearchTool,
    readRepoFileTool,
    gitLogBlameTool,
    traceDependenciesTool,
    tscNoEmitTool,
    runLinterAndTestsTool,
    submitBugReportTool,
]