import { RequireAuth } from "@/components/require-auth"
import { RepoManager } from "@/domains/repository/components/repo-manager"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MessageSquare } from "lucide-react"

export default function RepositoriesPage() {
  return (
    <RequireAuth font-mono>
      <main className="min-h-screen bg-muted/20 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Dashboard
              </Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link href="/chat">
                <MessageSquare className="w-4 h-4 mr-1" /> Mulai Triage Chat
              </Link>
            </Button>
          </div>
          <RepoManager />
        </div>
      </main>
    </RequireAuth>
  )
}
