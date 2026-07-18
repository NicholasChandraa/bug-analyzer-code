import { app } from "../src/hono-app.js"

/**
 * Vercel serverless entry point. Hono's `app` already implements the Web
 * Fetch API shape Vercel Functions expect ({ fetch(request): Response }),
 * so no adapter package is needed — see backend/vercel.json for the
 * catch-all rewrite that routes every path here.
 */
export default app
