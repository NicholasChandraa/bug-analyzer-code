import { serve } from "@hono/node-server"
import { env } from "./config/env.js"
import { logger } from "./utils/logger.js"
import { app } from "./hono-app.js"

/**
 * Local dev / persistent-server entry point (tsx watch, Railway, Render, any VPS).
 * Not used on Vercel — backend/api/index.ts hands the same `app` to the platform
 * as a serverless function instead of binding a port.
 */
serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(`Server running on http://localhost:${info.port}`)
})
