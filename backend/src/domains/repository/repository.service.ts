import fs from "fs"
import path from "path"
import type {
  CreateRepositoryRequestDTO,
  UpdateRepositoryRequestDTO,
  RepositoryResponseDTO,
  CodebaseSyncResponseDTO,
  BrowseDirectoriesResponseDTO,
} from "@restack/shared"

import { repositoryRepo, type RepositoryRow, type CodebaseSyncRow } from "./repository.repo.js"
import { syncRepository as syncRepositoryOnDisk } from "../../infra/code-search/git.js"
import { installDependencies } from "../../infra/verification/sandbox.js"

export class RepositoryNotFoundError extends Error { }
export class DuplicateSlugError extends Error { }

const toRepositoryResponseDTO = (repo: RepositoryRow): RepositoryResponseDTO => ({
    id: repo.id,
    name: repo.name,
    slug: repo.slug,
    sourceType: repo.sourceType,
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

        // Validate local path existence if local mode
        if (data.sourceType === "local") {
            const resolved = path.resolve(data.localPath)
            if (!fs.existsSync(resolved)) {
                throw new Error(`Local directory "${data.localPath}" does not exist on host PC`)
            }
        }

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

        if (data.localPath) {
            const resolved = path.resolve(data.localPath)
            if (!fs.existsSync(resolved)) {
                throw new Error(`Local directory "${data.localPath}" does not exist on host PC`)
            }
        }

        const repo = await repositoryRepo.updateRepository(id, data)
        if (!repo) throw new RepositoryNotFoundError("Repository not found")
        return toRepositoryResponseDTO(repo)
    },

    deleteRepository: async (id: number): Promise<void> => {
        const deleted = await repositoryRepo.deleteRepository(id)
        if (!deleted) throw new RepositoryNotFoundError("Repository not found")
    },

    syncRepository: async (userId: number, repositoryId?: number): Promise<CodebaseSyncResponseDTO[]> => {
        const targets = repositoryId
            ? [await repositoryRepo.getRepositoryById(repositoryId)]
            : await repositoryRepo.listRepositories()

        if (repositoryId && !targets[0]) throw new RepositoryNotFoundError("Repository not found")

        const logs: CodebaseSyncResponseDTO[] = []
        for (const repo of targets) {
            if (!repo) continue

            if (repo.sourceType === "local") {
                // Local PC mode: Skip git clone and Docker pnpm install, verify local directory exists
                const resolved = path.resolve(repo.localPath)
                if (!fs.existsSync(resolved)) {
                    throw new Error(`Folder lokal PC "${repo.localPath}" tidak ditemukan`)
                }
            } else {
                // Remote GitHub mode: git clone/pull and Docker sandbox pnpm install
                await syncRepositoryOnDisk({ repoUrl: repo.repoUrl, localPath: repo.localPath, defaultBranch: repo.defaultBranch })

                const install = await installDependencies(repo.localPath)
                if (!install.passed) throw new Error(`Dependency install gagal buat repo "${repo.slug}": ${install.output}`)
            }

            const log = await repositoryRepo.logCodebaseSync(userId, repo.id)
            logs.push(toCodebaseSyncResponseDTO(log))
        }
        return logs
    },

    getLastCodebaseSync: async (repositoryId?: number): Promise<CodebaseSyncResponseDTO | null> => {
        const log = await repositoryRepo.getLastCodebaseSync(repositoryId)
        return log ? toCodebaseSyncResponseDTO(log) : null
    },

    // --- Internal endpoints (dipanggil Engine, gak lewat requireAuth/requireRole - lihat catatan
    // di repository.routes.ts) ---
    resolveRepositoryBySlugInternal: async (slug: string): Promise<RepositoryResponseDTO> => {
        const repo = await repositoryRepo.getRepositoryBySlug(slug)
        if (!repo) throw new RepositoryNotFoundError(`Repository dengan slug "${slug}" belum terdaftar`)
        return toRepositoryResponseDTO(repo)
    },

    listRepositoriesInternal: async (slugs?: string[]): Promise<RepositoryResponseDTO[]> => {
        const repos = (slugs && slugs.length > 0)
            ? (await Promise.all(slugs.map((s) => repositoryRepo.getRepositoryBySlug(s)))).filter((r): r is RepositoryRow => r !== null)
            : await repositoryRepo.listRepositories()
        return repos.map(toRepositoryResponseDTO)
    },

    browseDirectories: async (targetPath?: string): Promise<BrowseDirectoriesResponseDTO> => {
        const rootDir = process.cwd()
        const resolvedPath = targetPath ? path.resolve(targetPath) : rootDir

        let entries: fs.Dirent[]
        try {
            entries = await fs.promises.readdir(resolvedPath, { withFileTypes: true })
        } catch {
            throw new Error(`Directory "${resolvedPath}" does not exist or is not readable`)
        }

        const directories = entries
            .filter((e) => e.isDirectory() && !e.name.startsWith("."))
            .map((e) => ({
                name: e.name,
                path: path.join(resolvedPath, e.name).replace(/\\/g, "/"),
            }))

        const normalizedCurrent = resolvedPath.replace(/\\/g, "/")
        const parent = path.dirname(resolvedPath)
        const normalizedParent = parent !== resolvedPath ? parent.replace(/\\/g, "/") : null

        return {
            currentPath: normalizedCurrent,
            parentPath: normalizedParent,
            directories,
        }
    },
}