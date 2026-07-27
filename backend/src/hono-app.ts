import { Hono } from "hono"
import { cors } from "hono/cors"
import { csrf } from "hono/csrf"
import { HTTPException } from "hono/http-exception"
import { logger as honoLogger } from "hono/logger"
import { requestId } from "hono/request-id"
import { env } from "./config/env.js"
import { logger, type AppVariables } from "./utils/logger.js"
import { authRoutes } from "./domains/auth/auth.routes.js"
import { userRoutes } from "./domains/user/user.routes.js"
import { repositoryRoutes } from "./domains/repository/repository.routes.js"
import { triageRoutes } from "./domains/triage/triage.routes.js"

/**
 * Hono application instance — routes, middleware, everything except the transport.
 * Kept separate from index.ts so this same app can run under a persistent Node
 * server (local dev, Railway/Render/VPS) or as a Vercel serverless function
 * (backend/api/index.ts), which cannot call @hono/node-server's serve().
 */
export const app = new Hono<{ Variables: AppVariables }>()

const allowedOrigins = env.FRONTEND_URL
  .split(",")
  .map((url) => url.trim())

// 1. Generate unique request IDs for all API calls
app.use("/api/*", requestId())

// 2. Set up Pino child logger with correlation metadata per request
app.use("/api/*", async (c, next) => {
  const reqId = c.get("requestId") || ""
  const { method, url } = c.req

  const reqLogger = logger.child({
    requestId: reqId,
    method,
    url: new URL(url).pathname,
  })

  c.set("logger", reqLogger)
  await next()
})

// 3. Request Logging (bridge Hono's output into our Pino logger)
app.use(
  "/api/*",
  honoLogger((...args) => {
    logger.info(args.join(" "))
  })
)

app.use(
  "/api/*",
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
)

app.use(
  "/api/*",
  csrf({
    origin: allowedOrigins,
  })
)

const routes = app
  .route("/api/auth", authRoutes)
  .route("/api/user", userRoutes)
  .route("/api/repositories", repositoryRoutes)
  .route("/api/triage", triageRoutes)

app.get("/", (c) => c.json({ status: "ok" }))

// Global 404 Not Found handler for JSON responses
app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404)
})

// Global Error handler: transforms HTTPExceptions (like CSRF 403) and unhandled errors into JSON
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err.status === 403) {
      return c.json(
        {
          error: "Forbidden: CSRF validation failed. Invalid or missing Origin header.",
        },
        403
      )
    }
    return c.json({ error: err.message || "HTTP Exception" }, err.status)
  }

  const reqLogger = c.get("logger") || logger
  reqLogger.error({ err: err.message, stack: err.stack }, "Unhandled error")

  return c.json(
    {
      error: "Internal server error",
      message: env.NODE_ENV === "development" ? err.message : undefined,
    },
    500
  )
})

export type AppType = typeof routes



