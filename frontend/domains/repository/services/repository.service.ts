import { client, unwrap } from "@/lib/api-client"
import type {
  CreateRepositoryRequestDTO,
  UpdateRepositoryRequestDTO,
  RepositoryResponseDTO,
  CodebaseSyncResponseDTO,
  BrowseDirectoriesResponseDTO,
} from "@restack/shared"

export const repositoryService = {
  listRepositories: async (): Promise<RepositoryResponseDTO[]> => {
    const res = await unwrap<{ repositories: RepositoryResponseDTO[] }>(
      client.api.repositories.$get()
    )
    return res.repositories
  },

  getRepositoryDetail: async (id: number): Promise<RepositoryResponseDTO> => {
    const res = await unwrap<{ repository: RepositoryResponseDTO }>(
      client.api.repositories[":id"].$get({ param: { id: String(id) } })
    )
    return res.repository
  },

  registerRepository: async (
    data: CreateRepositoryRequestDTO
  ): Promise<RepositoryResponseDTO> => {
    const res = await unwrap<{ repository: RepositoryResponseDTO }>(
      client.api.repositories.$post({ json: data })
    )
    return res.repository
  },

  updateRepository: async (
    id: number,
    data: UpdateRepositoryRequestDTO
  ): Promise<RepositoryResponseDTO> => {
    const res = await unwrap<{ repository: RepositoryResponseDTO }>(
      client.api.repositories[":id"].$put({
        param: { id: String(id) },
        json: data,
      })
    )
    return res.repository
  },

  deleteRepository: async (id: number): Promise<void> => {
    const res = await client.api.repositories[":id"].$delete({
      param: { id: String(id) },
    })
    if (!res.ok) {
      throw new Error("Failed to delete repository")
    }
  },

  syncCodebase: async (
    repositoryId?: number
  ): Promise<CodebaseSyncResponseDTO[]> => {
    const res = await unwrap<{ logs: CodebaseSyncResponseDTO[] }>(
      client.api.repositories.sync.$post({
        json: { repositoryId },
      })
    )
    return res.logs
  },

  getLastSyncLog: async (
    repositoryId?: number
  ): Promise<CodebaseSyncResponseDTO | null> => {
    const res = await unwrap<{ log: CodebaseSyncResponseDTO | null }>(
      client.api.repositories.sync.last.$get({
        query: repositoryId ? { repositoryId: String(repositoryId) } : {},
      })
    )
    return res.log
  },

  browseDirectories: async (
    targetPath?: string
  ): Promise<BrowseDirectoriesResponseDTO> => {
    const res = await unwrap<BrowseDirectoriesResponseDTO>(
      client.api.repositories["browse-dirs"].$get({
        query: targetPath ? { path: targetPath } : {},
      })
    )
    return res
  },
}
