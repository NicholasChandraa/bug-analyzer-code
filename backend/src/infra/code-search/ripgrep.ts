import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { rgPath } from "@vscode/ripgrep";
import { getErrorMessage } from "../../utils/error.js";
import { logger } from "../../utils/logger.js";

const execFileAsync = promisify(execFile);

export interface SearchMatch {
    repoPath: string
    filePath: string
    lineNumber: number
    lineContent: string
}

export interface SearchOptions {
    maxMatchesPerRepo?: number
    caseSensitive?: boolean
}

interface RipgrepJsonEvent {
    type: string
    data: {
        path: { text: string }
        line_number: number
        lines: { text: string }
    }
}

const DEFAULT_MAX_MATCHES_PER_REPO = 50

/**
 * Runs ripgrep across one or more registered repo checkouts and returns structured matches.
 * `query` comes from LLM-extracted keywords (untrusted input) - it's passed as a discrete
 * execFile argv entry (no shell involved) and always matched literally (--fixed-strings),
 * so it can never be interpreted as a regex or used for command injection.
 */
export async function searchAcrossRepos(
    query: string,
    repoPaths: string[],
    options: SearchOptions = {}
): Promise<SearchMatch[]> {
    const maxMatches = options.maxMatchesPerRepo ?? DEFAULT_MAX_MATCHES_PER_REPO

    const results = await Promise.all(
        repoPaths.map((repoPath) => searchOneRepo(query, repoPath, maxMatches, options.caseSensitive ?? false))
    )

    return results.flat()
}

async function searchOneRepo(
    query: string,
    repoPath: string,
    maxMatches: number,
    caseSensitive: boolean
): Promise<SearchMatch[]> {
    const args = [
        "--json",
        "--fixed-strings",
        "--max-count",
        String(maxMatches),
        caseSensitive ? "--case-sensitive" : "--ignore-case",
        "--",
        query,
        repoPath,
    ]

    try {
        const { stdout } = await execFileAsync(rgPath, args, { maxBuffer: 10 * 1024 * 1024 })
        return parseMatches(stdout, repoPath, maxMatches)
    } catch (error) {
        // ripgrep exists with code 1 when a search simply finds nothing - that's not a failure.
        if (isNoMatchExit(error)) return []
        throw new Error(`ripgrep search failed in ${repoPath}: ${getErrorMessage(error)}`)
    }
}

function parseMatches(stdout: string, repoPath: string, maxMatches: number): SearchMatch[] {
    const matches: SearchMatch[] = []
    for (const line of stdout.split("\n")) {
        logger.debug({ line }, "Parsing ripgrep match line")

        if (!line) continue

        const event = JSON.parse(line) as RipgrepJsonEvent
        if (event.type !== "match") continue

        matches.push({
            repoPath,
            filePath: event.data.path.text,
            lineNumber: event.data.line_number,
            lineContent: event.data.lines.text.trimEnd(),
        })
        if (matches.length >= maxMatches) break
    }

    return matches
}

function isNoMatchExit(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as {
        code?: number
    }).code === 1
}