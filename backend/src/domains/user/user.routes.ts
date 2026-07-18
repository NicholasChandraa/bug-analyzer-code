import { Hono } from "hono"
import type { Context } from "hono"
import { zValidator } from "@hono/zod-validator"
import { UpdateProfileSchema } from "@restack/shared"
import { requireAuth } from "../../infra/middlewares/require-auth.js"
import { userService, UserNotFoundError } from "./user.service.js"
import { logger, type AppVariables } from "../../utils/logger.js"

/**
 * Routing layer for the User domain.
 * Configures the router and defines endpoints with appropriate middlewares.
 * 
 * Semi-DDD rules:
 * - `.routes.ts` files define HTTP endpoints, parse inputs using schema validators (zValidator),
 *   apply guards (requireAuth), and serialize JSON responses.
 * - Routing code should never implement business logic directly; it must delegate to the service layer.
 */
const handleProfileError = (c: Context<{ Variables: AppVariables }>, e: unknown, action: string) => {
  if (e instanceof UserNotFoundError) return c.json({ error: e.message }, 404)
  const reqLogger = c.get("logger") || logger
  reqLogger.error({ err: e instanceof Error ? e.message : String(e) }, action)
  return c.json({ error: "Internal server error" }, 500)
}

export const userRoutes = new Hono<{ Variables: AppVariables }>()
  .get("/me", requireAuth, async (c) => {
    const reqLogger = c.get("logger") || logger
    try {
      reqLogger.info("Retrieving authenticated user profile")
      const user = c.get("user")
      if (!user) return c.json({ error: "Unauthorized" }, 401)
      const profile = await userService.getProfile(Number(user.sub))
      return c.json({ user: profile })
    } catch (e) {
      return handleProfileError(c, e, "Get profile failed")
    }
  })
  .put("/profile", requireAuth, zValidator("json", UpdateProfileSchema), async (c) => {
    const reqLogger = c.get("logger") || logger
    try {
      const body = c.req.valid("json")
      reqLogger.info("Updating user profile")
      const user = c.get("user")
      if (!user) return c.json({ error: "Unauthorized" }, 401)
      const profile = await userService.updateProfile(Number(user.sub), body)
      return c.json({ user: profile })
    } catch (e) {
      return handleProfileError(c, e, "Update profile failed")
    }
  })
