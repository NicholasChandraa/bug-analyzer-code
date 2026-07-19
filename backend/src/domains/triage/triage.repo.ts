import { eq, desc } from "drizzle-orm"
import { db } from "../../infra/db/index.js"
import { threadsTable, messagesTable, bugReportsTable, codebaseSyncTable } from "./triage.model.js"

/**
 * Buat type data mengikuti table database
 */
export type ThreadRow = typeof threadsTable.$inferSelect
export type MessageRow = typeof messagesTable.$inferSelect
export type BugReportRow = typeof bugReportsTable.$inferSelect
export type CodebaseSyncRow = typeof codebaseSyncTable.$inferSelect

/**
 * Repository layer for the Triage domain.
 * Semi-DDD rules: cuma query Drizzle disini, gak ada business logic.
 */
export const triageRepo = {
    // .returning() meminta database untuk mengembalikan data yang baru aja diinsert / update
    createThread: async (userId: number, title: string): Promise<ThreadRow> => {
        const [thread] = await db.insert(threadsTable).values({ userId, title }).returning()
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

    createdBugReport: async (data: typeof bugReportsTable.$inferInsert): Promise<BugReportRow> => {
        const [report] = await db.insert(bugReportsTable).values(data).returning()
        if (!report) throw new Error("Failed to create bug report")
        return report
    },

    listBugReports: async (): Promise<BugReportRow[]> => {
        return db.select().from(bugReportsTable).orderBy(desc(bugReportsTable.createdAt))
    },

    // Explicit return types are used. Since 'noUncheckedIndexedAccess' is enabled in tsconfig,
    // TS correctly infers array destructuring as potentially undefined, so `report ?? null` handles the empty array case.
    updateBugReportStatus: async (id: number, status: BugReportRow["status"]): Promise<BugReportRow | null> => {
        const [report] = await db.update(bugReportsTable).set({ status }).where(eq(bugReportsTable.id, id)).returning()
        return report ?? null
    },

    logCodebaseSync: async (userId: number): Promise<CodebaseSyncRow> => {
        const [log] = await db.insert(codebaseSyncTable).values({ syncedByUserId: userId }).returning()
        if (!log) throw new Error("Failed to log codebase sync")
        return log
    },

    getLastCodebaseSync: async (): Promise<CodebaseSyncRow | null> => {
        const [log] = await db.select().from(codebaseSyncTable).orderBy(desc(codebaseSyncTable.syncedAt)).limit(1)
        return log ?? null
    },
}