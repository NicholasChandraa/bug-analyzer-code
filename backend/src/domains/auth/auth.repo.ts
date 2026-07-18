import { and, eq, gt } from "drizzle-orm"
import { db } from "../../infra/db/index.js"
import { usersTable } from "../user/user.model.js"
import { authSessionsTable } from "./auth.model.js"

type UserRow = typeof usersTable.$inferSelect
type SessionRow = typeof authSessionsTable.$inferSelect

/**
 * Repository layer for the Auth domain.
 * Encapsulates sessions management and credential-based queries.
 * 
 * Semi-DDD rules:
 * - Direct database interactions (Drizzle client) must live only inside `.repo.ts` files.
 * - Under cross-domain rules, the Auth domain can query the User domain's tables (e.g. `usersTable`)
 *   directly for login resolution, ensuring that dependencies flow one way (auth -> user).
 */
export const authRepo = {
  // Explicit return type matters: without noUncheckedIndexedAccess, TS infers array
  // destructuring as always-defined, so `user ?? null` silently loses the null branch
  // and callers' `if (!user)` checks type-check as always-false without this annotation.
  findByEmail: async (email: string): Promise<UserRow | null> => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email))
    return user ?? null
  },

  create: async (data: { name: string; email: string; password: string }) => {
    const [user] = await db.insert(usersTable).values(data).returning()
    return user
  },

  createSession: async (data: { userId: number; refreshTokenHash: string; expiresAt: Date }) => {
    const [session] = await db.insert(authSessionsTable).values(data).returning()
    return session
  },

  // Atomic find-and-delete: a single DELETE...RETURNING so concurrent refresh
  // calls presenting the same token can't both pass a separate SELECT check
  // before either DELETE lands (TOCTOU) — only one caller ever gets a row back.
  consumeSessionByHash: async (refreshTokenHash: string): Promise<SessionRow | null> => {
    const [session] = await db
      .delete(authSessionsTable)
      .where(and(eq(authSessionsTable.refreshTokenHash, refreshTokenHash), gt(authSessionsTable.expiresAt, new Date())))
      .returning()
    return session ?? null
  },

  deleteSessionByHash: async (refreshTokenHash: string) => {
    await db.delete(authSessionsTable).where(eq(authSessionsTable.refreshTokenHash, refreshTokenHash))
  },
}
