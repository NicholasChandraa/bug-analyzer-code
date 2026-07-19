import { eq, desc } from "drizzle-orm"
import { db } from "../../infra/db/index.js"
import { threadsTable, messagesTable, bugReportsTable, codebaseSyncTable } from "./triage.model.js"

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
    createThread: async (userId: number, title: string): Promise<ThreadRow> => {
        const [thread] = await db.insert(threadsTable).values({ userId, title }).returning()
        return thread
    }
}