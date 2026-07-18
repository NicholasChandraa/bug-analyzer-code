import { eq } from "drizzle-orm"
import { db } from "../../infra/db/index.js"
import { usersTable } from "./user.model.js"

export type UserRow = typeof usersTable.$inferSelect

/**
 * Repository layer for the User domain.
 * Encapsulates all direct database queries for users.
 * 
 * Semi-DDD rules:
 * - Direct database interactions (Drizzle client) must live only inside `.repo.ts` files.
 * - Under cross-domain rules, the Auth domain can import from this repo (e.g. user lookup by ID/email),
 *   but the User domain must never depend on the Auth domain (one-way dependency flow).
 */
export const userRepo = {
  // Explicit return type matters: without noUncheckedIndexedAccess, TS infers array
  // destructuring as always-defined, so `user ?? null` silently loses the null branch
  // and callers' `if (!user)` checks type-check as always-false without this annotation.
  findById: async (id: number): Promise<UserRow | null> => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id))
    return user ?? null
  },

  updateProfile: async (id: number, data: { name?: string }): Promise<UserRow | null> => {
    const [user] = await db.update(usersTable).set(data).where(eq(usersTable.id, id)).returning()
    return user ?? null
  },
}
