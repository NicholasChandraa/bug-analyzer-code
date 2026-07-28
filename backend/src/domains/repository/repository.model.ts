import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "../user/user.model.js";

/**
 * Repositories Table Schema
 * Mengelola daftar folder lokal di disk yang dipindai AI Agent. Cuma lokal path - gak ada remote/clone.
 */
export const repositoriesTable = pgTable("repositories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  localPath: text("local_path").notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Codebase Sync Table Schema
 * Log tiap kali tombol "Update Codebase" diklik
 * repositoryId nullable: jika null, berarti sync semua repositori sekaligus
 */
export const codebaseSyncTable = pgTable("codebase_sync", {
  id: serial("id").primaryKey(),
  syncedByUserId: integer("synced_by_user_id")
    .notNull()
    .references(() => usersTable.id),
  repositoryId: integer("repository_id").references(
    () => repositoriesTable.id,
    { onDelete: "cascade" },
  ),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
});
