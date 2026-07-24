import { existsSync } from "node:fs";
import path from "node:path";
import { simpleGit } from "simple-git";
import { getErrorMessage } from "../../utils/error.js";

export interface SyncTarget {
    repoUrl: string
    localPath: string
    defaultBranch: string
}

export interface SyncResult {
    action: "cloned" | "pulled"
    localPath: string
}

/**
 * Clonse `repoUrl` into `localPath` if it isn't a git repo yet, otherwise fetches
 * and pulls `defaultBranch`. This is the only place that shells out to git -
 * repository.service.ts calls this and never touches simple-git direclty.
 */
export async function syncRepository(target: SyncTarget): Promise<SyncResult> {
    const gitDir = path.join(target.localPath, ".git")

    if (existsSync(gitDir)) {
        await pullRepository(target)
        return { action: "pulled", localPath: target.localPath }
    }
    await cloneRepository(target)
    return { action: "cloned", localPath: target.localPath }
}

export async function cloneRepository({ repoUrl, localPath, defaultBranch }: SyncTarget): Promise<void> {
    try {
        await simpleGit().clone(repoUrl, localPath, ["--branch", defaultBranch, "--single-branch"])
    } catch (error) {
        throw new Error(`Failed to clone ${repoUrl} into ${localPath}: ${getErrorMessage(error)}`)
    }
}

export async function pullRepository({ localPath, defaultBranch }: SyncTarget): Promise<void> {
    const git = simpleGit(localPath)
    try {
        await git.fetch("origin")
        await git.checkout(defaultBranch)
        await git.pull("origin", defaultBranch)
    } catch (error) {
        throw new Error(`Failed to pull ${defaultBranch} in ${localPath}: ${(error as Error).message}`)
    }
}