"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { AuthUser } from "@restack/shared"
import { userApi } from "../services/user.api"

/**
 * Domain-specific Hook for user profiles.
 * Manages loading, error, and profile states, abstracting backend calls.
 *
 * Redirects to /login on failure: there is no server-side (proxy.ts) auth gate
 * anymore — presence-only cookie checks can't work once frontend and backend
 * sit on unrelated domains (see docs/deployment-verification.md, Topology B),
 * so this client-side check is the only thing actually protecting this page.
 *
 * Semi-DDD rules:
 * - Domain hooks (`domains/[feature]/hooks/*.ts`) manage the reactive state and orchestrate calls to `services/`.
 * - UI components should import hooks to retrieve state and trigger actions, keeping the components themselves focused purely on layout/rendering.
 */
export function useProfile() {
  const router = useRouter()
  const [profile, setProfile] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    userApi
      .me()
      .then((res) => setProfile(res.user))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load profile")
        router.replace("/login")
      })
      .finally(() => setIsLoading(false))
  }, [router])

  return { profile, isLoading, error }
}
