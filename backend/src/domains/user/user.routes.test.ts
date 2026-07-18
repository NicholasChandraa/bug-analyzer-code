import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import { userRoutes } from "./user.routes.js"
import { authService } from "../auth/auth.service.js"
import { db } from "../../infra/db/index.js"
import { usersTable } from "./user.model.js"

const TEST_EMAIL = `user-routes-test-${Date.now()}@example.com`
let accessToken: string
let userId: number

beforeAll(async () => {
  const user = await authService.register({ name: "Route Test", email: TEST_EMAIL, password: "password123" })
  userId = user.id
  const tokens = await authService.issueTokenPair(user)
  accessToken = tokens.accessToken
})

afterAll(async () => {
  await db.delete(usersTable).where(eq(usersTable.id, userId))
})

const authHeaders = (token?: string) => ({
  "Content-Type": "application/json",
  ...(token ? { Cookie: `access_token=${token}` } : {}),
})

describe("GET /me", () => {
  it("returns 401 without a token", async () => {
    const res = await userRoutes.request("/me")
    expect(res.status).toBe(401)
  })

  it("returns the profile with a valid token", async () => {
    const res = await userRoutes.request("/me", { headers: authHeaders(accessToken) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe(TEST_EMAIL)
  })
})

describe("PUT /profile", () => {
  it("returns 401 without a token", async () => {
    const res = await userRoutes.request("/profile", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ name: "x" }),
    })
    expect(res.status).toBe(401)
  })

  it("updates the name with a valid token and body", async () => {
    const res = await userRoutes.request("/profile", {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ name: "Updated Name" }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.name).toBe("Updated Name")
  })

  it("rejects an invalid body (empty name)", async () => {
    const res = await userRoutes.request("/profile", {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ name: "" }),
    })
    expect(res.status).toBe(400)
  })

  it("treats an empty body as a no-op instead of erroring", async () => {
    const res = await userRoutes.request("/profile", {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe(TEST_EMAIL)
  })
})
