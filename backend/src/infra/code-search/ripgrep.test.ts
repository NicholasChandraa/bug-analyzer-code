import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { mkdtemp, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { searchAcrossRepos } from "./ripgrep.js"
import { promisify } from "node:util"
import { execFile } from "node:child_process"

let fixtureDir: string

beforeAll(async () => {
    fixtureDir = await mkdtemp(path.join(tmpdir(), "ripgrep-test-"))

    await writeFile(path.join(fixtureDir, "example.ts"), "export function handleLogin() {\nthrowUnauthorized()\n}\n")

    await writeFile(path.join(fixtureDir, "other.ts"), "export const unrelated = 1\n")
})

afterAll(async () => {

    await rm(fixtureDir, { recursive: true, force: true })

})

describe("searchAcrossRepos", () => {
    it("finds matching lines with file path and line number", async () => {
        const matches = await searchAcrossRepos("throwUnauthorized", [fixtureDir])
        expect(matches).toHaveLength(1)
        expect(matches[0].filePath).toContain("example.ts")
        expect(matches[0].lineNumber).toBe(2)
        expect(matches[0].repoPath).toBe(fixtureDir)
    })

    it("returns an empty array when nothing matches", async () => {
        const matches = await searchAcrossRepos("thisPatternDoesNotExistAnywhere", [fixtureDir])
        expect(matches).toEqual([])
    })

    it("treats the query as a literal string, not a regex", async () => {
        await writeFile(path.join(fixtureDir, "regex.ts"), "const x = 1;\n")
        const matches = await searchAcrossRepos("x = 1;", [fixtureDir])
        expect(matches.some((m) => m.filePath.includes("regex.ts"))).toBe(true)
    })
})