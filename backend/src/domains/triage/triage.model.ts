import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core"
import { usersTable } from "../user/user.model.js"

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"])
export const bugReportStatusEnum = pgEnum("bug_report_status", ["open", "in_progress", "resolved"])

/**
 * Threads Table Schema
 * satu thread = satu sesi percakapan bug report antara user dan agent
 */
export const threadsTable = pgTable("threads", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }), // Users di hapus, data threads juga ikut dihapus
    title: text("title").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
})

/**
 * Messages Table Schema
 * isi peracakapan per threadnya, dari user ataupun agent
 * imageUrl bisa kosong karena tiap message belum tentu dikirim imagenya.
 */
export const messagesTable = pgTable("messages", {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id").notNull().references(() => threadsTable.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
})

/**
 * Bug Reports Table Schema.
 * Output dari akhir node reviewer - ini yang ditampilkan di dashboard tim internal
 */
export const bugReportsTable = pgTable("bug_reports", {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id").notNull().references(() => threadsTable.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    lineEstimate: text("line_estimate"),
    reason: text("reason").notNull(),
    suggestedFix: text("suggested_fix").notNull(),
    status: bugReportStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
})

/**
 * Codebase Sync Table Schema.
 * Log tiap kali tombol "Update Codebase" diklik
 * Dipake buat nampilin timestamp "last synced" di dashboard.
 * Baris paling baru = state sync yang berlaku.
 */
export const codebaseSyncTable = pgTable("codebase_sync", {
    id: serial("id").primaryKey(),
    syncedByUserId: integer("synced_by_user_id").notNull().references(() => usersTable.id),
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
})
