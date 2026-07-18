"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { client, unwrap } from "../lib/api-client"

/**
 * Client-side auth gate for pages with no data fetch of their own to piggyback
 * a redirect on (see use-profile.ts for pages that need both). Necessary
 * because there is no server-side proxy.ts guard anymore — see the Next.js 16
 * caveat in DEVELOPMENT.md for why.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    unwrap(client.api.user.me.$get())
      .then(() => setChecked(true))
      .catch(() => router.replace("/login"))
  }, [router])

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  return <>{children}</>
}
