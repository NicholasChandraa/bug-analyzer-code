import type { CreateRepositoryRequestDTO, UpdateRepositoryRequestDTO, RepositoryResponseDTO, CodebaseSyncResponseDTO } from "@restack/shared"

import { repositoryRepo, type RepositoryRow, type CodebaseSyncRow } from "./repository.repo.js"
import { syncRepository as syncRepositoryOnDisk } from "../../infra/code-search/git.js"

export class RepositoryNotFoundError extends Error { }
export class DuplicateSlugError extends Error { }

const toRepositoryResponseDTO = (repo: RepositoryRow): RepositoryResponseDTO => ({
    id: repo.id,
    name: repo.name,
    slug: repo.slug,
    repoUrl: repo.repoUrl,
    localPath: repo.localPath,
    defaultBranch: repo.defaultBranch,
    lastSyncedAt: repo.lastSyncedAt ? repo.lastSyncedAt.toISOString() : null,
    createdAt: repo.createdAt.toISOString(),
})

const toCodebaseSyncResponseDTO = (log: CodebaseSyncRow): CodebaseSyncResponseDTO => ({
    id: log.id,
    syncedByUserId: log.syncedByUserId,
    repositoryId: log.repositoryId,
    syncedAt: log.syncedAt.toISOString(),
})

/**
 * Service layer for the Repository domain.
 * Semi-DDD rules: business logic only, no Drizzle access — always through repositoryRepo.
 */
export const repositoryService = {
    registerRepository: async (data: CreateRepositoryRequestDTO): Promise<RepositoryResponseDTO> => {
        const existing = await repositoryRepo.getRepositoryBySlug(data.slug)
        if (existing) throw new DuplicateSlugError(`Slug "${data.slug}" is already in use`)

        const repo = await repositoryRepo.createRepository(data)
        return toRepositoryResponseDTO(repo)
    },

    listRepositories: async (): Promise<RepositoryResponseDTO[]> => {
        const repos = await repositoryRepo.listRepositories()
        return repos.map(toRepositoryResponseDTO)
    },

    getRepositoryDetail: async (id: number): Promise<RepositoryResponseDTO> => {
        const repo = await repositoryRepo.getRepositoryById(id)
        if (!repo) throw new RepositoryNotFoundError("Repository not found")
        return toRepositoryResponseDTO(repo)
    },

    updateRepository: async (id: number, data: UpdateRepositoryRequestDTO): Promise<RepositoryResponseDTO> => {
        if (data.slug) {
            const existing = await repositoryRepo.getRepositoryBySlug(data.slug)
            if (existing && existing.id !== id) throw new DuplicateSlugError(`Slug "${data.slug}" is already in use`)
        }

        const repo = await repositoryRepo.updateRepository(id, data)
        if (!repo) throw new RepositoryNotFoundError("Repository not found")
        return toRepositoryResponseDTO(repo)
    },

    deleteRepository: async (id: number): Promise<void> => {
        const deleted = await repositoryRepo.deleteRepository(id)
        if (!deleted) throw new RepositoryNotFoundError("Repository not found")
    },

    // Syncs repo(s) dalam disk (clone/pull via git.ts) lalu mencatat baris log per repo yang disinkronisasikan.
    // `repositoryId` undefined means sync-all: setiap repos yang didaftarkan adalah sync berurutan,
    // each still gets its own log row (not one shared "bulk" row) because logCodebaseSync is
    // also what updates that repo's lastSyncedAt — skipping it would leave the dashboard's
    // per-repo timestamps stale after a sync-all. Fails fast: one repo failing aborts the rest.
    syncRepository: async (userId: number, repositoryId?: number): Promise<CodebaseSyncResponseDTO[]> => {
        const targets = repositoryId
            ? [await repositoryRepo.getRepositoryById(repositoryId)]
            : await repositoryRepo.listRepositories()

        if (repositoryId && !targets[0]) throw new RepositoryNotFoundError("Repository not found")

        const logs: CodebaseSyncResponseDTO[] = []
        for (const repo of targets) {
            if (!repo) continue
            await syncRepositoryOnDisk({ repoUrl: repo.repoUrl, localPath: repo.localPath, defaultBranch: repo.defaultBranch })
            const log = await repositoryRepo.logCodebaseSync(userId, repo.id)
            logs.push(toCodebaseSyncResponseDTO(log))
        }
        return logs
    },

    getLastCodebaseSync: async (repositoryId?: number): Promise<CodebaseSyncResponseDTO | null> => {
        const log = await repositoryRepo.getLastCodebaseSync(repositoryId)
        return log ? toCodebaseSyncResponseDTO(log) : null
    },
}