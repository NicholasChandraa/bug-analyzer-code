import { eq, desc } from "drizzle-orm"
import { db } from "../../infra/db/index.js"
import { repositoriesTable, codebaseSyncTable } from "./repository.model.js"

export type RepositoryRow = typeof repositoriesTable.$inferSelect
export type CodebaseSyncRow = typeof codebaseSyncTable.$inferSelect

/**
 * Repository layer for the Repository domain.
 * Semi-DDD rules: cuma query Drizzle disini, gak ada business logic.
 */
export const repositoryRepo = {
    createRepository: async (data: typeof repositoriesTable.$inferInsert): Promise<RepositoryRow> => {
        const [repo] = await db.insert(repositoriesTable).values(data).returning()
        if (!repo) throw new Error("Failed to create repository")
        return repo
    },

    listRepositories: async (): Promise<RepositoryRow[]> => {
        return db.select().from(repositoriesTable).orderBy(desc(repositoriesTable.createdAt))
    },

    getRepositoryById: async (id: number): Promise<RepositoryRow | null> => {
        const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id))
        return repo ?? null
    },

    getRepositoryBySlug: async (slug: string): Promise<RepositoryRow | null> => {
        const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.slug, slug))
        return repo ?? null
    },

    updateRepository: async (id: number, data: Partial<typeof repositoriesTable.$inferInsert>): Promise<RepositoryRow | null> => {
        const [repo] = await db.update(repositoriesTable).set(data).where(eq(repositoriesTable.id, id)).returning()
        return repo ?? null
    },

    deleteRepository: async (id: number): Promise<boolean> => {
        const result = await db.delete(repositoriesTable).where(eq(repositoriesTable.id, id)).returning()
        return result.length > 0
    },

    logCodebaseSync: async (userId: number, repositoryId?: number | null): Promise<CodebaseSyncRow> => {
        const [log] = await db.insert(codebaseSyncTable).values({ syncedByUserId: userId, repositoryId: repositoryId ?? null }).returning()
        if (!log) throw new Error("Failed to log codebase sync")

        if (repositoryId) {
            await db.update(repositoriesTable).set({ lastSyncedAt: new Date() }).where(eq(repositoriesTable.id, repositoryId))
        }

        return log
    },

    getLastCodebaseSync: async (repositoryId?: number): Promise<CodebaseSyncRow | null> => {
        if (repositoryId) {
            const [log] = await db
                .select()
                .from(codebaseSyncTable)
                .where(eq(codebaseSyncTable.repositoryId, repositoryId))
                .orderBy(desc(codebaseSyncTable.syncedAt))
                .limit(1)
            return log ?? null
        }

        const [log] = await db.select().from(codebaseSyncTable).orderBy(desc(codebaseSyncTable.syncedAt)).limit(1)
        return log ?? null
    },
}
