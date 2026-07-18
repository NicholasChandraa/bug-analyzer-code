import type { MiddlewareHandler } from "hono"
import { getCookie } from "hono/cookie"
import type { UserRole } from "@restack/shared"
import { authService } from "../../domains/auth/auth.service.js"
import type { AppVariables } from "../../utils/logger.js"

/**
 * Authentication guard middleware.
 * Enforces the presence and validity of the short-lived JWT access token in request cookies.
 * Resolves the payload, binds it to Hono context variables (`c.get("user")`),
 * and attaches the authenticated userId to the request logger context.
 * 
 * Usage:
 * Apply to any endpoint requiring authentication (e.g. `userRoutes.get("/me", requireAuth, ...)`).
 */
export const requireAuth: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  // Extract token from cookie (JWT)
  const token = getCookie(c, "access_token")
  if (!token) return c.json({ error: "Unauthorized" }, 401)

  try {
    // Decode and verify signature & expiration
    const payload = await authService.verifyAccessToken(token)
    c.set("user", payload)

    // Enrich the child logger with the user's ID for all downstream actions
    const reqLogger = c.get("logger")
    if (reqLogger) {
      c.set("logger", reqLogger.child({ userId: Number(payload.sub) }))
    }
  } catch {
    // Return standard 401 response on invalid / expired signature
    return c.json({ error: "Unauthorized" }, 401)
  }

  await next()
}

/**
 * Role guard — chain after `requireAuth` (needs `c.get("user")` already set).
 * Usage: `.get("/admin/thing", requireAuth, requireRole("admin"), handler)`
 */
export const requireRole = (role: UserRole): MiddlewareHandler<{ Variables: AppVariables }> =>
  async (c, next) => {
    const user = c.get("user")
    if (!user || user.role !== role) return c.json({ error: "Forbidden" }, 403)
    await next()
  }
