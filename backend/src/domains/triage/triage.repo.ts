import { eq, desc } from "drizzle-orm"
import { db } from "../../infra/db/index.js"
import { repositoriesTable } from "../repository/repository.model.js"
import { threadsTable, messagesTable, bugReportsTable } from "./triage.model.js"

/**
 * Buat type data mengikuti table database
 */
export type ThreadRow = typeof threadsTable.$inferSelect
export type MessageRow = typeof messagesTable.$inferSelect
export type BugReportRow = typeof bugReportsTable.$inferSelect

/**
 * Repository layer for the Triage domain.
 * Semi-DDD rules: cuma query Drizzle disini, gak ada business logic.
 */
export const triageRepo = {
    // --- Thread & Message ---
    createThread: async (userId: number, title: string, repositoryId?: number | null): Promise<ThreadRow> => {
        const [thread] = await db.insert(threadsTable).values({ userId, title, repositoryId: repositoryId ?? null }).returning()
        if (!thread) throw new Error("Failed to create thread")
        return thread
    },

    listThreadsByUser: async (userId: number): Promise<ThreadRow[]> => {
        return db.select().from(threadsTable).where(eq(threadsTable.userId, userId)).orderBy(desc(threadsTable.createdAt))
    },

    addMessage: async (data: typeof messagesTable.$inferInsert): Promise<MessageRow> => {
        const [message] = await db.insert(messagesTable).values(data).returning()
        if (!message) throw new Error("Failed to add message")
        return message
    },

    listMessagesByThread: async (threadId: number): Promise<MessageRow[]> => {
        return db.select().from(messagesTable).where(eq(messagesTable.threadId, threadId)).orderBy(messagesTable.createdAt)
    },

    // --- Bug Reports ---
    createdBugReport: async (data: typeof bugReportsTable.$inferInsert): Promise<BugReportRow> => {
        const [report] = await db.insert(bugReportsTable).values(data).returning()
        if (!report) throw new Error("Failed to create bug report")
        return report
    },

    listBugReports: async (): Promise<BugReportRow[]> => {
        return db.select().from(bugReportsTable).orderBy(desc(bugReportsTable.createdAt))
    },

    listBugReportsWithDetails: async () => {
        return db
            .select({
                id: bugReportsTable.id,
                threadId: bugReportsTable.threadId,
                repositoryId: bugReportsTable.repositoryId,
                repositoryName: repositoriesTable.name,
                repositorySlug: repositoriesTable.slug,
                filePath: bugReportsTable.filePath,
                lineEstimate: bugReportsTable.lineEstimate,
                reason: bugReportsTable.reason,
                suggestedFix: bugReportsTable.suggestedFix,
                status: bugReportsTable.status,
                createdAt: bugReportsTable.createdAt,
            })
            .from(bugReportsTable)
            .innerJoin(repositoriesTable, eq(bugReportsTable.repositoryId, repositoriesTable.id))
            .orderBy(desc(bugReportsTable.createdAt))
    },

    updateBugReportStatus: async (id: number, status: BugReportRow["status"]): Promise<BugReportRow | null> => {
        const [report] = await db.update(bugReportsTable).set({ status }).where(eq(bugReportsTable.id, id)).returning()
        return report ?? null
    },
}