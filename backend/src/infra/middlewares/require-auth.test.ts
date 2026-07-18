import { describe, it, expect } from "vitest"
import { Hono } from "hono"
import { SignJWT } from "jose"
import { requireAuth } from "./require-auth.js"
import type { AuthVariables } from "./require-auth.js"
import { env } from "../../config/env.js"

const secret = new TextEncoder().encode(env.JWT_SECRET)

const signTestToken = (payload: Record<string, unknown>, expiresIn = "15m") =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime(expiresIn).sign(secret)

function buildApp() {
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use("/protected", requireAuth)
  app.get("/protected", (c) => c.json({ user: c.get("user") }))
  return app
}

describe("requireAuth", () => {
  it("returns 401 when no access_token cookie is present", async () => {
    const res = await buildApp().request("/protected")
    expect(res.status).toBe(401)
  })

  it("returns 401 when the token is garbage", async () => {
    const res = await buildApp().request("/protected", {
      headers: { Cookie: "access_token=not-a-real-token" },
    })
    expect(res.status).toBe(401)
  })

  it("returns 401 when the token is expired", async () => {
    const expired = await signTestToken({ sub: "user-1", email: "a@b.com" }, "-1s")
    const res = await buildApp().request("/protected", {
      headers: { Cookie: `access_token=${expired}` },
    })
    expect(res.status).toBe(401)
  })

  it("calls next() and exposes the payload when the token is valid", async () => {
    const token = await signTestToken({ sub: "user-1", email: "a@b.com" })
    const res = await buildApp().request("/protected", {
      headers: { Cookie: `access_token=${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.sub).toBe("user-1")
    expect(body.user.email).toBe("a@b.com")
  })
})
