import { describe, it, expect, vi, beforeEach } from "vitest"
import { repositoryService, RepositoryNotFoundError, DuplicateSlugError } from "./repository.service.js"
import { repositoryRepo } from "./repository.repo.js"
import { syncRepository } from "../../infra/code-search/git.js"

vi.mock("./repository.repo.js", () => ({
    repositoryRepo: {
        createRepository: vi.fn(),
        listRepositories: vi.fn(),
        getRepositoryById: vi.fn(),
        getRepositoryBySlug: vi.fn(),
        updateRepository: vi.fn(),
        deleteRepository: vi.fn(),
        logCodebaseSync: vi.fn(),
        getLastCodebaseSync: vi.fn(),
    },
}))

vi.mock("../../infra/code-search/git.js", () => ({
    syncRepository: vi.fn(),
}))

const mockedRepo = vi.mocked(repositoryRepo, true)
const mockedSync = vi.mocked(syncRepository)

const dbRepo = (overrides: Partial<Awaited<ReturnType<typeof repositoryRepo.getRepositoryById>>> = {}) => ({
    id: 1,
    name: "Frontend App",
    slug: "frontend",
    repoUrl: "git@github.com:example/frontend.git",
    localPath: "./repos/frontend",
    defaultBranch: "main",
    lastSyncedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
})

const dbSyncLog = (overrides: Partial<Awaited<ReturnType<typeof repositoryRepo.logCodebaseSync>>> = {}) => ({
    id: 1,
    syncedByUserId: 1,
    repositoryId: 1,
    syncedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
})

beforeEach(() => {
    vi.clearAllMocks()
})

describe("repositoryService.registerRepository", () => {
    it("throws if the slug is already in use", async () => {
        mockedRepo.getRepositoryBySlug.mockResolvedValue(dbRepo())
        await expect(
            repositoryService.registerRepository({
                name: "Frontend App",
                slug: "frontend",
                repoUrl: "git@github.com:example/frontend.git",
                localPath: "./repos/frontend",
                defaultBranch: "main",
            })
        ).rejects.toThrow(DuplicateSlugError)
    })

    it("creates the repository and returns the DTO shape", async () => {
        mockedRepo.getRepositoryBySlug.mockResolvedValue(null)
        mockedRepo.createRepository.mockResolvedValue(dbRepo())

        const repo = await repositoryService.registerRepository({
            name: "Frontend App",
            slug: "frontend",
            repoUrl: "git@github.com:example/frontend.git",
            localPath: "./repos/frontend",
            defaultBranch: "main",
        })

        expect(repo).toEqual({
            id: 1,
            name: "Frontend App",
            slug: "frontend",
            repoUrl: "git@github.com:example/frontend.git",
            localPath: "./repos/frontend",
            defaultBranch: "main",
            lastSyncedAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
        })
    })
})

describe("repositoryService.getRepositoryDetail", () => {
    it("throws RepositoryNotFoundError when missing", async () => {
        mockedRepo.getRepositoryById.mockResolvedValue(null)
        await expect(repositoryService.getRepositoryDetail(999)).rejects.toThrow(RepositoryNotFoundError)
    })
})

describe("repositoryService.updateRepository", () => {
    it("throws DuplicateSlugError when renaming into a slug used by another repo", async () => {
        mockedRepo.getRepositoryBySlug.mockResolvedValue(dbRepo({ id: 2 }))
        await expect(repositoryService.updateRepository(1, { slug: "taken" })).rejects.toThrow(DuplicateSlugError)
    })

    it("allows keeping the same slug on the same repo", async () => {
        mockedRepo.getRepositoryBySlug.mockResolvedValue(dbRepo({ id: 1 }))
        mockedRepo.updateRepository.mockResolvedValue(dbRepo({ name: "Renamed" }))
        const repo = await repositoryService.updateRepository(1, { slug: "frontend", name: "Renamed" })
        expect(repo.name).toBe("Renamed")
    })

    it("throws RepositoryNotFoundError when the repo doesn't exist", async () => {
        mockedRepo.updateRepository.mockResolvedValue(null)
        await expect(repositoryService.updateRepository(999, { name: "X" })).rejects.toThrow(RepositoryNotFoundError)
    })
})

describe("repositoryService.deleteRepository", () => {
    it("throws RepositoryNotFoundError when nothing was deleted", async () => {
        mockedRepo.deleteRepository.mockResolvedValue(false)
        await expect(repositoryService.deleteRepository(999)).rejects.toThrow(RepositoryNotFoundError)
    })
})

describe("repositoryService.syncRepository", () => {
    it("syncs a single repo on disk and logs it", async () => {
        mockedRepo.getRepositoryById.mockResolvedValue(dbRepo())
        mockedSync.mockResolvedValue({ action: "pulled", localPath: "./repos/frontend" })
        mockedRepo.logCodebaseSync.mockResolvedValue(dbSyncLog())

        const logs = await repositoryService.syncRepository(1, 1)

        expect(mockedSync).toHaveBeenCalledWith({
            repoUrl: "git@github.com:example/frontend.git",
            localPath: "./repos/frontend",
            defaultBranch: "main",
        })
        expect(logs).toHaveLength(1)
    })

    it("throws RepositoryNotFoundError when syncing a specific repo that doesn't exist", async () => {
        mockedRepo.getRepositoryById.mockResolvedValue(null)
        await expect(repositoryService.syncRepository(1, 999)).rejects.toThrow(RepositoryNotFoundError)
    })

    it("syncs every registered repo and logs each one when no repositoryId is given", async () => {
        mockedRepo.listRepositories.mockResolvedValue([dbRepo({ id: 1 }), dbRepo({ id: 2, slug: "backend" })])
        mockedSync.mockResolvedValue({ action: "cloned", localPath: "./repos/x" })
        mockedRepo.logCodebaseSync.mockResolvedValue(dbSyncLog())

        const logs = await repositoryService.syncRepository(1)

        expect(mockedSync).toHaveBeenCalledTimes(2)
        expect(mockedRepo.logCodebaseSync).toHaveBeenCalledTimes(2)
        expect(logs).toHaveLength(2)
    })
})