"use client"

import { RequireAuth } from "@/components/require-auth"
import { ChatInterface } from "@/domains/triage/components/chat-interface"
import { useProfile } from "@/domains/user/hooks/use-profile"
import Link from "next/link"
import { Button } from "@/components/ui/button"

function ChatPageContent() {
  const { profile } = useProfile()
  const isAdmin = profile?.role === "admin"
  const dashboardHref = isAdmin ? "/admin/dashboard" : "/dashboard"

  return (
    <main className="min-h-screen bg-background p-4 text-foreground">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={dashboardHref}>
              &larr; Kembali ke Dashboard
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/repositories">
                Kelola Repositori
              </Link>
            </Button>
          )}
        </div>
        <ChatInterface />
      </div>
    </main>
  )
}

export default function ChatPage() {
  return (
    <RequireAuth>
      <ChatPageContent />
    </RequireAuth>
  )
}
