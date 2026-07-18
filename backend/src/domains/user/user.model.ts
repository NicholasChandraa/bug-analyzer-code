import { pgTable, text, timestamp, serial, pgEnum } from "drizzle-orm/pg-core"

export const userRoleEnum = pgEnum("user_role", ["user", "admin"])

/**
 * Users Table Schema.
 * Defines the core database table layout for registered users.
 * Fields: id (sequential serial integer), name (raw string), email (unique), password (bcrypt hash), role, and createdAt.
 */
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
