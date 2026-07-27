import { RequireAuth } from "@/components/require-auth"
import { ChatInterface } from "@/domains/triage/components/chat-interface"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LayoutDashboard } from "lucide-react"

export default function ChatPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-muted/20 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/repositories">
                <LayoutDashboard className="w-4 h-4 mr-1" /> Kelola Repositori
              </Link>
            </Button>
          </div>
          <ChatInterface />
        </div>
      </main>
    </RequireAuth>
  )
}
