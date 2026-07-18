import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { env } from "../../config/env.js"

/**
 * Database client initialization.
 * Starts the `postgres-js` connection pool using the validated DATABASE_URL environment setting
 * and wraps it with the Drizzle ORM client wrapper.
 */
const client = postgres(env.DATABASE_URL, { max: 1 })
export const db = drizzle(client)
