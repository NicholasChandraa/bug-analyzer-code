import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core"
import { usersTable } from "../user/user.model.js"

/**
 * Repositories Table Schema
 * Mengelola daftar repositori yang dipindai oleh AI Agent (e.g. frontend, backend)
 */
export const repositoriesTable = pgTable("repositories", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(), // Display name, e.g. "Frontend App"
    slug: text("slug").notNull().unique(), // Key unik, e.g. "frontend"
    repoUrl: text("repo_url").notNull(), // Git clone URL atau remote path
    localPath: text("local_path").notNull(), // Folder path di disk VPS/lokal tempat ripgrep mencari
    defaultBranch: text("default_branch").notNull().default("main"),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
})

/**
 * Codebase Sync Table Schema
 * Log tiap kali tombol "Update Codebase" diklik
 * repositoryId nullable: jika null, berarti sync semua repositori sekaligus
 */
export const codebaseSyncTable = pgTable("codebase_sync", {
    id: serial("id").primaryKey(),
    syncedByUserId: integer("synced_by_user_id").notNull().references(() => usersTable.id),
    repositoryId: integer("repository_id").references(() => repositoriesTable.id, { onDelete: "cascade" }),
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
})
