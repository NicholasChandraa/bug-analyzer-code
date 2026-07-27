import { execFile, exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getErrorMessage } from "../../utils/error.js";
import { validatePathBoundary } from "../security/path-guard.js";

const execFileAsync = promisify(execFile)
const execAsync = promisify(exec)

const TIMEOUT_MS = 5 * 60 * 1000
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024
const SANDBOX_IMAGE = "node:20-slim"
const PREPARE_PNPM = "corepack enable && corepack prepare pnpm@latest --activate"

export interface CommandResult {
    passed: boolean
    output: string
}

export async function installDependencies(repoPath: string): Promise<CommandResult> {
    return runInSandbox(repoPath, `${PREPARE_PNPM} && pnpm install`, { allowNetwork: true })
}

/**
 * Menjalankan `npx tsc --noEmit`.
 * Jika `isLocalMode === true`, dieksekusi langsung di host PC (`cwd: repoPath`).
 * Jika `isLocalMode === false`, dieksekusi di dalam container Docker sandbox.
 */
export async function runTypeCheck(repoPath: string, isLocalMode = false): Promise<CommandResult> {
    const validatedPath = validatePathBoundary(repoPath, repoPath)
    if (isLocalMode) {
        return runLocalHostCommand(validatedPath, "npx tsc --noEmit")
    }
    return runInSandbox(validatedPath, "npx tsc --noEmit", { allowNetwork: false })
}

/**
 * Menjalankan skrip "lint" dan "test" milik repositori.
 * Jika `isLocalMode === true`, dieksekusi langsung di host PC (`cwd: repoPath`).
 * Jika `isLocalMode === false`, dieksekusi di dalam container Docker sandbox.
 */
export async function runLinterAndTests(repoPath: string, isLocalMode = false): Promise<CommandResult> {
    const validatedPath = validatePathBoundary(repoPath, repoPath)
    const scripts = await getPackageScripts(validatedPath)
    const commands: string[] = []

    if (scripts.lint) commands.push("pnpm run lint")
    if (scripts.test) commands.push("pnpm test")

    if (commands.length === 0) {
        return { passed: true, output: "Tidak ditemukan skrip lint atau test di package.json - dilewati." }
    }

    const commandStr = commands.join(" && ")

    if (isLocalMode) {
        return runLocalHostCommand(validatedPath, commandStr)
    }

    return runInSandbox(validatedPath, `${PREPARE_PNPM} && ${commandStr}`, { allowNetwork: false })
}

async function getPackageScripts(repoPath: string): Promise<Record<string, string>> {
    try {
        const raw = await readFile(path.join(repoPath, "package.json"), "utf-8")
        return JSON.parse(raw).scripts ?? {}
    } catch {
        return {}
    }
}

async function runLocalHostCommand(repoPath: string, command: string): Promise<CommandResult> {
    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd: repoPath,
            timeout: TIMEOUT_MS,
            maxBuffer: MAX_OUTPUT_BYTES,
        })
        return { passed: true, output: stdout + stderr }
    } catch (error) {
        return { passed: false, output: getErrorMessage(error) }
    }
}

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
