import { RequireAuth } from "@/components/require-auth"
import { BugReportList } from "@/domains/triage/components/bug-report-list"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MessageSquare } from "lucide-react"

export default function BugReportsPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-muted/20 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Dashboard
              </Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link href="/chat">
                <MessageSquare className="w-4 h-4 mr-1" /> Triage Chat
              </Link>
            </Button>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Laporan Bug Terverifikasi</h2>
            <p className="text-muted-foreground text-sm">
              Daftar hasil analisis bug dan perbaikan kode yang diajukan oleh Smart Bug Triage Agent.
            </p>
          </div>
          <BugReportList />
        </div>
      </main>
    </RequireAuth>
  )
}
