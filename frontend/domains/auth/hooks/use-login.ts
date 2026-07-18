"use client"

import { LoginSchema, type LoginInput } from "@restack/shared"
import { useAuthMutation } from "@/hooks/use-auth-mutation"
import { authApi } from "../services/auth.api"

/**
 * Domain-specific hook for Login (Auth Domain).
 * Orchestrates login form mutation by wrapping the reusable useAuthMutation hook.
 * 
 * Semi-DDD rules:
 * - Domain hooks hide specific Zod validation schemas, API calls, and loading states from components.
 */
export function useLogin() {
  const { submit, error, isPending } = useAuthMutation<LoginInput>(LoginSchema, authApi.login)
  return { login: submit, error, isPending }
}
