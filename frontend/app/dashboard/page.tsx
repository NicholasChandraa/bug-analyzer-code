"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import logo from "@/public/logo.png"
import { LogoutButton } from "@/domains/auth/components/logout-button"
import { Button } from "@/components/ui/button"
import { RequireAuth } from "@/components/require-auth"
import { useProfile } from "@/domains/user/hooks/use-profile"
import { useRepositories } from "@/domains/repository/hooks/use-repositories"
import { RepoSelectionDialog } from "@/domains/repository/components/repo-selection-dialog"
import { ThemeToggle } from "@/components/theme-toggle"

function UserDashboardContent() {
  const router = useRouter()
  const { profile, isLoading } = useProfile()
  const { repositories } = useRepositories()
  const [isRepoDialogOpen, setIsRepoDialogOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && profile?.role === "admin") {
      router.replace("/admin/dashboard")
    }
  }, [profile, isLoading, router])

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <div className="text-sm font-mono animate-pulse">Loading user dashboard...</div>
      </div>
    )
  }

  if (profile.role === "admin") {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#090d16]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors">
              <Image src={logo} alt="Logo" className="w-5 h-5 object-contain" priority />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">
              Smart Bug Triage
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              <Link href="/profile">Profil</Link>
            </Button>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-heading">
                Selamat Datang, {profile.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                USER
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Pusat analisis bug otomatis dan rekomendasi patch teruji.
            </p>
          </div>

          <Button onClick={() => setIsRepoDialogOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 shadow-md shrink-0">
            Mulai Chat Triage Baru
          </Button>
        </div>

        {/* User Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Primary Action Hero Card */}
          <div className="md:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 space-y-6 flex flex-col justify-between shadow-sm hover:border-orange-500/30 transition-colors">
            <div className="space-y-3">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider bg-orange-500 text-white uppercase shadow-sm">Sesi Utama</span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Mulai Bug Triage Chat</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Jalankan AI Agent untuk melacak stack trace, memindai simbol codebase, dan menghasilkan usulan patch teruji.
              </p>
            </div>

            <Button size="lg" className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold px-6" onClick={() => setIsRepoDialogOpen(true)}>
              Pilih Repositori & Mulai Chat
            </Button>
          </div>

          {/* Secondary Bug Reports Card */}
          <div className="md:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 space-y-6 flex flex-col justify-between shadow-sm hover:border-slate-400 dark:hover:border-slate-700 transition-colors">
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Laporan Bug & Patch</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Lihat riwayat perbaikan kode dan usulan diff terverifikasi yang telah dibuat.
              </p>
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/bug-reports">Buka Laporan Bug</Link>
            </Button>
          </div>
        </div>
      </main>

      <RepoSelectionDialog
        isOpen={isRepoDialogOpen}
        onClose={() => setIsRepoDialogOpen(false)}
        repositories={repositories}
      />
    </div>
  )
}

export default function UserDashboardPage() {
  return (
    <RequireAuth requiredRole="user">
      <UserDashboardContent />
    </RequireAuth>
  )
}
