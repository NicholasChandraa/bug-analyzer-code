import { z } from "zod"

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

/** TypeScript input type inferred from LoginSchema. */
export type LoginInput = z.infer<typeof LoginSchema>

/** TypeScript input type inferred from RegisterSchema. */
export type RegisterInput = z.infer<typeof RegisterSchema>
