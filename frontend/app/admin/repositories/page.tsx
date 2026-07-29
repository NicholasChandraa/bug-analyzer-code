import { RequireAuth } from "@/components/require-auth"
import { RepoManager } from "@/domains/repository/components/repo-manager"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AdminRepositoriesPage() {
  return (
    <RequireAuth requiredRole="admin">
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/dashboard">
                &larr; Kembali ke Admin Dashboard
              </Link>
            </Button>
          </div>
          <RepoManager />
        </div>
      </main>
    </RequireAuth>
  )
}
