"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { authApi } from "../services/auth.api"

/**
 * LogoutButton Component (Auth Domain).
 * Simple action component to trigger sessions termination and redirect.
 * 
 * Semi-DDD rules:
 * - Simple action triggers can invoke services directly if no reactive local states/business orchestration is required.
 */
export function LogoutButton() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const handleLogout = async () => {
    setIsPending(true)
    await authApi.logout()
    router.push("/login")
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={isPending}>
      {isPending ? "Logging out..." : "Logout"}
    </Button>
  )
}
