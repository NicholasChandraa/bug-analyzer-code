import type { JWTPayload } from "jose"
import type { UserRole } from "@restack/shared"

export interface AuthTokenPayload extends JWTPayload {
  sub: string
  email: string
  role: UserRole
}
