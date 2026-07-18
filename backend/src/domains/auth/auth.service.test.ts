import { describe, it, expect, vi, beforeEach } from "vitest"
import bcrypt from "bcryptjs"
import { authService } from "./auth.service.js"
import { authRepo } from "./auth.repo.js"
import { userRepo } from "../user/user.repo.js"

vi.mock("./auth.repo.js", () => ({
  authRepo: {
    findByEmail: vi.fn(),
    create: vi.fn(),
    createSession: vi.fn(),
    consumeSessionByHash: vi.fn(),
    deleteSessionByHash: vi.fn(),
  },
}))

vi.mock("../user/user.repo.js", () => ({
  userRepo: {
    findById: vi.fn(),
    updateProfile: vi.fn(),
  },
}))

const mockedAuthRepo = vi.mocked(authRepo, true)
const mockedUserRepo = vi.mocked(userRepo, true)

const dbUser = (overrides: Partial<{ id: number; name: string; email: string; password: string }> = {}) => ({
  id: 1,
  name: "X",
  email: "a@b.com",
  password: "hash",
  createdAt: new Date(),
  ...overrides,
})

const dbSession = (overrides: Partial<{ id: number; userId: number; refreshTokenHash: string; expiresAt: Date }> = {}) => ({
  id: 1,
  userId: 1,
  refreshTokenHash: "hash",
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("authService.register", () => {
  it("throws if the email is already in use", async () => {
    mockedAuthRepo.findByEmail.mockResolvedValue(dbUser())
    await expect(
      authService.register({ name: "X", email: "a@b.com", password: "password123" })
    ).rejects.toThrow("Email already in use")
  })

  it("creates the user with a hashed password and a normalized email", async () => {
    mockedAuthRepo.findByEmail.mockResolvedValue(null)
    mockedAuthRepo.create.mockImplementation(async (data) => dbUser(data))

    const user = await authService.register({ name: "X", email: "  A@B.com  ", password: "password123" })

    expect(user).toEqual({ id: 1, name: "X", email: "a@b.com" })
    const createdArg = mockedAuthRepo.create.mock.calls[0][0]
    expect(createdArg.email).toBe("a@b.com")
    expect(createdArg.password).not.toBe("password123")
  })
})

describe("authService.login", () => {
  it("throws on an unknown email", async () => {
    mockedAuthRepo.findByEmail.mockResolvedValue(null)
    await expect(authService.login({ email: "nope@example.com", password: "whatever1" })).rejects.toThrow(
      "Invalid credentials"
    )
  })

  it("throws on a wrong password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4)
    mockedAuthRepo.findByEmail.mockResolvedValue(dbUser({ password: passwordHash }))
    await expect(authService.login({ email: "a@b.com", password: "wrong-password" })).rejects.toThrow(
      "Invalid credentials"
    )
  })

  it("returns the public user shape on correct credentials", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4)
    mockedAuthRepo.findByEmail.mockResolvedValue(dbUser({ password: passwordHash }))
    const user = await authService.login({ email: "a@b.com", password: "correct-password" })
    expect(user).toEqual({ id: 1, name: "X", email: "a@b.com" })
  })
})

describe("authService.refresh", () => {
  it("throws when no session matches the hashed token (invalid/expired/already-consumed)", async () => {
    mockedAuthRepo.consumeSessionByHash.mockResolvedValue(null)
    await expect(authService.refresh("some-token")).rejects.toThrow("Invalid refresh token")
  })

  it("rotates: the old session is consumed and a fresh pair is issued", async () => {
    mockedAuthRepo.consumeSessionByHash.mockResolvedValue(dbSession())
    mockedUserRepo.findById.mockResolvedValue(dbUser())
    mockedAuthRepo.createSession.mockResolvedValue(dbSession({ id: 2 }))

    const result = await authService.refresh("old-token")

    expect(result.user).toEqual({ id: 1, name: "X", email: "a@b.com" })
    expect(typeof result.accessToken).toBe("string")
    expect(typeof result.refreshToken).toBe("string")
    expect(mockedAuthRepo.createSession).toHaveBeenCalledTimes(1)
  })

  it("throws if the session's user no longer exists", async () => {
    mockedAuthRepo.consumeSessionByHash.mockResolvedValue(dbSession({ userId: 999 }))
    mockedUserRepo.findById.mockResolvedValue(null)
    await expect(authService.refresh("old-token")).rejects.toThrow("Invalid refresh token")
  })
})

describe("authService.revokeSession", () => {
  it("deletes the session matching the hashed token", async () => {
    await authService.revokeSession("some-token")
    expect(mockedAuthRepo.deleteSessionByHash).toHaveBeenCalledWith(expect.any(String))
  })
})

describe("authService.verifyAccessToken", () => {
  it("round-trips a token issued by issueTokenPair", async () => {
    mockedAuthRepo.createSession.mockResolvedValue(dbSession())
    const { accessToken } = await authService.issueTokenPair({ id: 1, name: "X", email: "a@b.com" })
    const payload = await authService.verifyAccessToken(accessToken)
    expect(payload.sub).toBe("1")
    expect(payload.email).toBe("a@b.com")
  })

  it("rejects a tampered token", async () => {
    mockedAuthRepo.createSession.mockResolvedValue(dbSession())
    const { accessToken } = await authService.issueTokenPair({ id: 1, name: "X", email: "a@b.com" })
    const i = accessToken.indexOf(".") + 5
    const tampered = accessToken.slice(0, i) + (accessToken[i] === "a" ? "b" : "a") + accessToken.slice(i + 1)
    await expect(authService.verifyAccessToken(tampered)).rejects.toThrow()
  })
})
