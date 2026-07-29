import { describe, it, expect } from "vitest"
import { app } from "./hono-app.js"

describe("Hono App Global Error Handling & CSRF", () => {
  it("returns JSON error format on CSRF failure for unsafe HTTP methods", async () => {
    const res = await app.request("/api/auth/refresh", {
      method: "POST",
      // No Origin or invalid Origin header provided
      headers: {
        "Origin": "http://malicious-website.com",
      },
    })

    expect(res.status).toBe(403)
    expect(res.headers.get("content-type")).toContain("application/json")
    const body = await res.json()
    expect(body.error).toContain("Forbidden: CSRF validation failed. Invalid or missing Origin header.")
  })

  it("returns 404 JSON for non-existent routes under /api", async () => {
    const res = await app.request("/api/non-existent-route")

    expect(res.status).toBe(404)
    expect(res.headers.get("content-type")).toContain("application/json")
    const body = await res.json()
    expect(body.error).toBe("Route not found")
  })
})
