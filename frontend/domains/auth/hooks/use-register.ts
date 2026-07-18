"use client"

import { RegisterSchema, type RegisterInput } from "@restack/shared"
import { useAuthMutation } from "@/hooks/use-auth-mutation"
import { authApi } from "../services/auth.api"

/**
 * Domain-specific hook for Registration (Auth Domain).
 * Orchestrates registration form mutation by wrapping the reusable useAuthMutation hook.
 * 
 * Semi-DDD rules:
 * - Domain hooks hide specific Zod validation schemas, API calls, and loading states from components.
 */
export function useRegister() {
  const { submit, error, isPending } = useAuthMutation<RegisterInput>(RegisterSchema, authApi.register)
  return { register: submit, error, isPending }
}
