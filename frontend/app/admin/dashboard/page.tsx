"use client"

import Link from "next/link"
import Image from "next/image"
import logo from "@/public/logo.png"
import { LogoutButton } from "@/domains/auth/components/logout-button"
import { Button } from "@/components/ui/button"
import { RequireAuth } from "@/components/require-auth"
import { useProfile } from "@/domains/user/hooks/use-profile"
import { useRepositories } from "@/domains/repository/hooks/use-repositories"
import { ThemeToggle } from "@/components/theme-toggle"

function AdminDashboardContent() {
  const { profile, isLoading } = useProfile()
  const { repositories } = useRepositories()

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <div className="text-sm font-mono animate-pulse">Loading admin portal...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#090d16]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="p-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors">
              <Image src={logo} alt="Logo" className="w-5 h-5 object-contain" priority />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">
              Smart Bug Triage (Admin Portal)
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              <Link href="/profile">Profil Admin</Link>
            </Button>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Admin Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-heading">
                Portal Manajemen Admin, {profile.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-orange-500 text-white shadow-sm">
                ADMIN
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Pusat pengelolaan repositori target, konfigurasi sistem, dan pemantauan status server.
            </p>
          </div>

          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 shadow-md shrink-0">
            <Link href="/admin/repositories">Buka Kelola Repositori</Link>
          </Button>
        </div>

        {/* Admin System Metrics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
            <div className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">REPOSITORI TERHUBUNG</div>
            <div className="text-3xl font-bold font-mono text-slate-900 dark:text-white">{repositories.length} Project</div>
            <p className="text-xs text-slate-500 pt-1">Total repositori target aktif di server lokal.</p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
            <div className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">STATUS SISTEM AGENT</div>
            <div className="text-3xl font-bold font-mono text-emerald-500 flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" /> Active & Synchronized
            </div>
            <p className="text-xs text-slate-500 pt-1">Engine backend (Port 3001) berjalan normal.</p>
          </div>
        </div>

        {/* Admin Management Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Repository Management Main Card */}
          <div className="md:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 space-y-6 flex flex-col justify-between shadow-sm hover:border-orange-500/30 transition-colors">
            <div className="space-y-3">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider bg-orange-500 text-white uppercase shadow-sm">Manajemen Utama</span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Kelola Repositori Target</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Daftarkan repositori lokal baru, perbarui lokasi direktori codebase, dan jalankan sinkronisasi indeks simbol Ripgrep.
              </p>
            </div>

            <Button asChild size="lg" className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold px-6">
              <Link href="/admin/repositories">Kelola Repositori Sekarang</Link>
            </Button>
          </div>

          {/* System Inspection Card */}
          <div className="md:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 space-y-6 flex flex-col justify-between shadow-sm hover:border-slate-400 dark:hover:border-slate-700 transition-colors">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">Inspeksi Server</span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Status Lingkungan Server</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Inspeksi berkas repositori lokal dan kesiapan environment server untuk eksekusi AI Agent.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <div>System: Node.js / Hono Engine</div>
              <div>Backend API: Port 3001</div>
              <div>Ripgrep Index: Synchronized</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <RequireAuth requiredRole="admin">
      <AdminDashboardContent />
    </RequireAuth>
  )
}
