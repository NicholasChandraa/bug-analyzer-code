import { z } from "zod";

/**
 * Zod validation schema untuk manajemen repository (Request Input)
 * Repo cuma lokal folder di disk - gak ada remote/clone, gak ada sourceType/repoUrl/defaultBranch.
 */
export const CreateRepositorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain lowercase letters, numbers, and hyphens",
    ),
  localPath: z.string().min(1),
});

export type CreateRepositoryRequestDTO = z.infer<typeof CreateRepositorySchema>;

export const UpdateRepositorySchema = CreateRepositorySchema.partial();

export type UpdateRepositoryRequestDTO = z.infer<typeof UpdateRepositorySchema>;

/**
 * Zod validation schema buat body POST /sync (Request Input)
 */
export const SyncRepositorySchema = z.object({
  repositoryId: z.number().int().positive().optional(),
});

export type SyncRepositoryRequestDTO = z.infer<typeof SyncRepositorySchema>;

/**
 * Bentuk Response DTO publik untuk Repository dan CodebaseSync
 */
export interface RepositoryResponseDTO {
  id: number;
  name: string;
  slug: string;
  localPath: string;
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface CodebaseSyncResponseDTO {
  id: number;
  syncedByUserId: number;
  repositoryId: number | null;
  repositoryName?: string;
  syncedAt: string;
}

export interface DirectoryItemDTO {
  name: string;
  path: string;
}

export interface BrowseDirectoriesResponseDTO {
  currentPath: string;
  parentPath: string | null;
  directories: DirectoryItemDTO[];
}
