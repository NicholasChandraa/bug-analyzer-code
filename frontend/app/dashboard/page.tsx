import Link from "next/link"
import { LogoutButton } from "@/domains/auth/components/logout-button"
import { Button } from "@/components/ui/button"
import { RequireAuth } from "@/components/require-auth"

/**
 * Next.js Router Page: Dashboard
 *
 * Semi-DDD rules:
 * - Files in `frontend/app/` are strictly for layout, routing config, metadata, or entry gates.
 * - Do not implement custom JSX layouts, forms, state, or complex components here.
 * - Always import and delegate rendering to domain feature components (e.g. `<LogoutButton />`).
 */
export default function DashboardPage() {
  return (
    <RequireAuth>
      <main className="p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <LogoutButton />
        </div>
        <p className="text-muted-foreground mt-2">You are logged in.</p>
        <Button asChild className="mt-6">
          <Link href="/profile">Profile</Link>
        </Button>
      </main>
    </RequireAuth>
  )
}
