"use client"

import { useState } from "react"
import Link from "next/link"
import { LogoutButton } from "@/domains/auth/components/logout-button"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { RequireAuth } from "@/components/require-auth"
import { useProfile } from "@/domains/user/hooks/use-profile"
import { useRepositories } from "@/domains/repository/hooks/use-repositories"
import { RepoSelectionDialog } from "@/domains/repository/components/repo-selection-dialog"
import { MessageSquare, FolderGit2, Bug, User, ShieldCheck } from "lucide-react"

function DashboardContent() {
  const { profile, isLoading } = useProfile()
  const { repositories } = useRepositories()
  const [isRepoDialogOpen, setIsRepoDialogOpen] = useState(false)
  const isAdmin = profile?.role === "admin"

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Smart Bug Triage Dashboard</h1>
            {!isLoading && profile && (
              isAdmin ? (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" /> ADMIN
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <User className="w-3.5 h-3.5" /> USER
                </Badge>
              )
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {profile ? `Selamat datang, ${profile.name}. ` : ""}Pusat analisis bug dan manajemen repositori.
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className={`grid grid-cols-1 gap-6 ${isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
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
            <Button className="w-full" onClick={() => setIsRepoDialogOpen(true)}>
              Mulai Chat Agent
            </Button>
          </CardContent>
        </Card>

        {/* Khusus Admin: Kartu Kelola Repositori disembunyikan sepenuhnya dari User biasa */}
        {isAdmin && (
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderGit2 className="w-5 h-5 text-primary" />
                Kelola Repositori
              </CardTitle>
              <CardDescription>
                Daftarkan repo target dan jalankan pembaruan codebase lokal & environment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/repositories">Buka Repositori</Link>
              </Button>
            </CardContent>
          </Card>
        )}

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

      <RepoSelectionDialog
        isOpen={isRepoDialogOpen}
        onClose={() => setIsRepoDialogOpen(false)}
        repositories={repositories}
      />
    </main>
  )
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  )
}


