import { Hono } from "hono"
import type { Context } from "hono"
import { setCookie, deleteCookie, getCookie } from "hono/cookie"
import { zValidator } from "@hono/zod-validator"
import { LoginSchema, RegisterSchema } from "@restack/shared"
import { authService, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "./auth.service.js"
import { env } from "../../config/env.js"
import { logger, type AppVariables } from "../../utils/logger.js"

/**
 * Routing layer for the Auth domain.
 * Defines the public endpoints for login, registration, logout, and token rotation.
 * 
 * Semi-DDD rules:
 * - `.routes.ts` files define HTTP endpoints, validate request payloads, and apply CORS/CSRF configurations.
 * - Endpoints should delegate business flow execution directly to the service layer.
 */
const isProduction = env.NODE_ENV === "production"
const sameSite = (env.COOKIE_SAME_SITE || (isProduction ? "None" : "Lax")) as "Lax" | "None" | "Strict"
const secure = sameSite === "None" ? true : isProduction

const domainOpt = env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}
const deleteCookieOpts = (path: string) => ({ path, secure, sameSite, ...domainOpt })
const cookieOpts = (path: string, maxAge: number) => ({ ...deleteCookieOpts(path), httpOnly: true, maxAge })

const accessTokenCookieOptions = cookieOpts("/", ACCESS_TOKEN_TTL_SECONDS)
const refreshTokenCookieOptions = cookieOpts("/", REFRESH_TOKEN_TTL_SECONDS)

const setAuthCookies = (c: Context, tokens: { accessToken: string; refreshToken: string }) => {
  setCookie(c, "access_token", tokens.accessToken, accessTokenCookieOptions)
  setCookie(c, "refresh_token", tokens.refreshToken, refreshTokenCookieOptions)
}

const clearAuthCookies = (c: Context) => {
  deleteCookie(c, "access_token", deleteCookieOpts("/"))
  deleteCookie(c, "refresh_token", deleteCookieOpts("/"))
}

export const authRoutes = new Hono<{ Variables: AppVariables }>()
  .post("/register", zValidator("json", RegisterSchema), async (c) => {
    const reqLogger = c.get("logger") || logger
    try {
      reqLogger.info("Starting user registration")
      const body = c.req.valid("json")
      const user = await authService.register(body)
      const tokens = await authService.issueTokenPair(user)

      setAuthCookies(c, tokens)

      return c.json({ user }, 201)
    } catch (e: any) {
      reqLogger.error({ err: e.message }, "Register failed")
      return c.json({ error: e.message }, 400)
    }
  })
  .post("/login", zValidator("json", LoginSchema), async (c) => {
    const reqLogger = c.get("logger") || logger
    try {
      reqLogger.info("Attempting user login")
      const body = c.req.valid("json")
      const user = await authService.login(body)
      const tokens = await authService.issueTokenPair(user)

      setAuthCookies(c, tokens)

      return c.json({ user })
    } catch (e: any) {
      reqLogger.error({ err: e.message }, "Login failed")
      return c.json({ error: e.message }, 401)
    }
  })
  .post("/refresh", async (c) => {
    const reqLogger = c.get("logger") || logger
    const refreshToken = getCookie(c, "refresh_token")
    if (!refreshToken) return c.json({ error: "Missing refresh token" }, 401)

    try {
      reqLogger.info("Attempting token rotation")
      const tokens = await authService.refresh(refreshToken)
      setAuthCookies(c, tokens)
      return c.json({ user: tokens.user })
    } catch (e: any) {
      clearAuthCookies(c)
      reqLogger.error({ err: e.message }, "Refresh failed")
      return c.json({ error: "Invalid refresh token" }, 401)
    }
  })
  .post("/logout", async (c) => {
    const refreshToken = getCookie(c, "refresh_token")
    if (refreshToken) await authService.revokeSession(refreshToken)

    clearAuthCookies(c)
    return c.json({ success: true })
  })
