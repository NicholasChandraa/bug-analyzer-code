import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core"
import { usersTable } from "../user/user.model.js"
import { repositoriesTable } from "../repository/repository.model.js"

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"])
export const bugReportStatusEnum = pgEnum("bug_report_status", ["open", "in_progress", "resolved"])

/**
 * Threads Table Schema
 * satu thread = satu sesi percakapan bug report antara user dan agent
 * repositoryId nullable: jika null, agent mencari di semua repo yang terdaftar
 */
export const threadsTable = pgTable("threads", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    repositoryId: integer("repository_id").references(() => repositoriesTable.id, { onDelete: "set null" }),
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
 * repositoryId menunjuk spesifik repositori mana yang terdapat bug
 */
export const bugReportsTable = pgTable("bug_reports", {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id").notNull().references(() => threadsTable.id, { onDelete: "cascade" }),
    repositoryId: integer("repository_id").notNull().references(() => repositoriesTable.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    lineEstimate: text("line_estimate"),
    reason: text("reason").notNull(),
    suggestedFix: text("suggested_fix").notNull(),
    status: bugReportStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
})
