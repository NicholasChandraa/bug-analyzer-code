import { z } from "zod"
import type { UserResponseDTO } from "./user.schema.js"

/** Zod validation schema for login form and request payload. */
export const LoginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
})

/** Zod validation schema for registering a new account. */
export const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email().max(254),
  password: z.string().min(8).max(128),
})

/** TypeScript input Request DTO inferred from LoginSchema. */
export type LoginRequestDTO = z.infer<typeof LoginSchema>

/** TypeScript input Request DTO inferred from RegisterSchema. */
export type RegisterRequestDTO = z.infer<typeof RegisterSchema>

/** Response DTO returned by login/register/refresh endpoints. */
export interface AuthResponseDTO {
  user: UserResponseDTO
}

/** Response DTO returned by logout endpoint. */
export interface LogoutResponseDTO {
  success: boolean
}
