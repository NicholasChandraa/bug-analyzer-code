import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { randomBytes, createHash } from "node:crypto"
import type { AuthUser, LoginInput, RegisterInput } from "@restack/shared"
import { env } from "../../config/env.js"
import { authRepo } from "./auth.repo.js"
import { userRepo } from "../user/user.repo.js"
import type { AuthTokenPayload } from "./auth.types.js"

/**
 * Service layer for the Auth domain.
 * Houses core validation and cryptographic flows (JWT token signing, refresh token generation, hashing).
 * 
 * Semi-DDD rules:
 * - `.service.ts` files encapsulate business rules and complex workflows (e.g. session issuance & rotation).
 * - They must never call Drizzle ORM directly; always interact through the repo layer.
 */
const secret = new TextEncoder().encode(env.JWT_SECRET)
const BCRYPT_COST = 12
// Dummy hash so failed logins on unknown emails still pay the bcrypt cost (timing-attack mitigation).
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing-safety", BCRYPT_COST)
const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 15 // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

const buildTokenPayload = (user: AuthUser): AuthTokenPayload => ({
  sub: String(user.id),
  email: user.email,
  role: user.role,
})

const signAccessToken = (user: AuthUser) =>
  new SignJWT(buildTokenPayload(user))
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret)

// Opaque, high-entropy refresh token — not a JWT, so it carries no forgeable claims.
// Only its sha256 hash is ever persisted (see auth.model.ts), so a DB leak alone can't be replayed.
const generateRefreshToken = () => randomBytes(32).toString("hex")
const hashRefreshToken = (token: string) => createHash("sha256").update(token).digest("hex")

const issueTokenPair = async (user: AuthUser) => {
  const accessToken = await signAccessToken(user)
  const refreshToken = generateRefreshToken()
  await authRepo.createSession({
    userId: user.id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  })
  return { accessToken, refreshToken, user }
}

export const authService = {
  register: async (data: RegisterInput): Promise<AuthUser> => {
    const email = normalizeEmail(data.email)
    const existing = await authRepo.findByEmail(email)
    if (existing) throw new Error("Email already in use")

    const password = await bcrypt.hash(data.password, BCRYPT_COST)
    const user = await authRepo.create({ ...data, email, password })
    return { id: user.id, name: user.name, email: user.email, role: user.role }
  },

  login: async (data: LoginInput): Promise<AuthUser> => {
    const user = await authRepo.findByEmail(normalizeEmail(data.email))
    const valid = await bcrypt.compare(data.password, user ? user.password : DUMMY_HASH)
    if (!user || !valid) throw new Error("Invalid credentials")

    return { id: user.id, name: user.name, email: user.email, role: user.role }
  },

  issueTokenPair,

  // Rotates the refresh token on every use: consuming it (atomic delete) and issuing
  // a brand new pair means a stolen-but-already-used token becomes worthless, and
  // concurrent requests racing on the same token can only ever have one winner.
  refresh: async (refreshToken: string) => {
    const session = await authRepo.consumeSessionByHash(hashRefreshToken(refreshToken))
    if (!session) throw new Error("Invalid refresh token")

    const user = await userRepo.findById(session.userId)
    if (!user) throw new Error("Invalid refresh token")

    return issueTokenPair({ id: user.id, name: user.name, email: user.email, role: user.role })
  },

  revokeSession: async (refreshToken: string) => {
    await authRepo.deleteSessionByHash(hashRefreshToken(refreshToken))
  },

  verifyAccessToken: async (token: string): Promise<AuthTokenPayload> => {
    const { payload } = await jwtVerify(token, secret)
    return payload as AuthTokenPayload
  },
}
