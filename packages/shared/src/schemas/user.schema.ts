import { z } from "zod"

export type UserRole = "user" | "admin"

/** Public user shape returned by user/auth endpoints (register/login/refresh/me) — never includes the password hash. */
export interface UserResponseDTO {
  id: number
  name: string
  email: string
  role: UserRole
}

/** Zod validation schema for updating user profile (partial updates). */
export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
})

/** TypeScript input Request DTO inferred from UpdateProfileSchema. */
export type UpdateProfileRequestDTO = z.infer<typeof UpdateProfileSchema>
