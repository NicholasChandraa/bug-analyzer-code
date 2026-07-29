"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { UserResponseDTO, UserRole } from "@restack/shared"
import { userApi } from "@/domains/user/services/user.api"
import { Button } from "@/components/ui/button"

interface RequireAuthProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

/**
 * Client-side auth & role gate component.
 * Verifies the presence and validity of the user session via GET /api/user/me.
 * If `requiredRole` is specified and user's role does not match, renders an
 * access-denied notice rather than leaking admin-only views.
 */
export function RequireAuth({ children, requiredRole }: RequireAuthProps) {
  const router = useRouter()
  const [user, setUser] = useState<UserResponseDTO | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    userApi
      .me()
      .then((res) => {
        setUser(res.user)
        setChecked(true)
      })
      .catch(() => router.replace("/login"))
  }, [router])

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (requiredRole && user?.role !== requiredRole) {
    const targetDashboard = user?.role === "admin" ? "/admin/dashboard" : "/dashboard"

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 bg-card shadow-sm">
          <h2 className="text-xl font-bold text-foreground">Akses Ditolak (403 Forbidden)</h2>
          <p className="text-sm text-muted-foreground">
            Halaman ini membutuhkan hak akses <strong className="text-foreground">{requiredRole.toUpperCase()}</strong>.
            Role akun Anda saat ini adalah <strong className="text-foreground">{user?.role.toUpperCase()}</strong>.
          </p>
          <div className="pt-2">
            <Button asChild variant="default" className="w-full">
              <Link href={targetDashboard}>
                &larr; Kembali ke Dashboard ({user?.role.toUpperCase()})
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
