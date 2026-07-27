import Link from "next/link"
import { LogoutButton } from "@/domains/auth/components/logout-button"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { RequireAuth } from "@/components/require-auth"
import { MessageSquare, FolderGit2, Bug, User } from "lucide-react"

export default function DashboardPage() {
  return (
    <RequireAuth>
      <main className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">Smart Bug Triage Dashboard</h1>
            <p className="text-muted-foreground text-sm">Selamat datang di pusat analisis bug dan manajemen repositori.</p>
          </div>
          <LogoutButton />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
                Bug Triage Chat
              </CardTitle>
              <CardDescription>
                Mulai percakapan interaktif dengan AI Agent untuk melacak dan merumuskan perbaikan kode.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/chat">Mulai Chat Agent</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderGit2 className="w-5 h-5 text-primary" />
                Kelola Repositori
              </CardTitle>
              <CardDescription>
                Daftarkan repo target (Admin) dan jalankan pembaruan codebase lokal & environment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/repositories">Buka Repositori</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bug className="w-5 h-5 text-primary" />
                Laporan Bug
              </CardTitle>
              <CardDescription>
                Lihat daftar hasil perbaikan kode dan rekomendasi bug yang terverifikasi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/bug-reports">Lihat Laporan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="pt-4 flex justify-end">
          <Button asChild variant="ghost" size="sm">
            <Link href="/profile">
              <User className="w-4 h-4 mr-1.5" /> Pengaturan Profil
            </Link>
          </Button>
        </div>
      </main>
    </RequireAuth>
  )
}
