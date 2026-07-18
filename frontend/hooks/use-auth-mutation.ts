"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ZodType } from "zod"

/**
 * Reusable mutation hook for authorization forms (Login, Register).
 * Standardizes Zod input validation, pending state tracking, error handling,
 * and automatic client-side redirection on successful mutation.
 */
export function useAuthMutation<TInput>(schema: ZodType<TInput>, mutate: (data: TInput) => Promise<unknown>) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const submit = async (data: TInput) => {
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setIsPending(true)
    setError(null)
    try {
      await mutate(parsed.data)
      router.push("/dashboard")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setIsPending(false)
    }
  }

  return { submit, error, isPending }
}
