import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core"
import { usersTable } from "../user/user.model.js"

/**
 * Auth Sessions Table Schema.
 * Tracks active, refreshable user login sessions.
 * 
 * Security rules:
 * - We only store the SHA-256 hash of the refresh token (`refreshTokenHash`),
 *   protecting the user session from being compromised if the database leaks.
 * - Cascade delete is used so removing a user automatically purges all their active sessions.
 */
export const authSessionsTable = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  // sha256 of the opaque refresh token — never store the raw token.
  refreshTokenHash: text("refresh_token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
