import { z } from "zod"

export type UserRole = "user" | "admin"

/** Public user shape returned by auth endpoints (register/login/refresh) — never includes the password hash. */
export interface AuthUser {
  id: number
  name: string
  email: string
  role: UserRole
}

/** Zod validation schema for updating user profile (partial updates). */
export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
})

/** TypeScript input type inferred from UpdateProfileSchema. */
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
