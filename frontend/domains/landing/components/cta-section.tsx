"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

/**
 * Landing Page CTA Section component.
 * Features final CTA push to register or open the dashboard.
 */
export function CtaSection() {
  return (
    <section className="py-20 lg:py-24 bg-slate-950 text-white relative overflow-hidden border-b border-slate-800/60">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-cyan-500/10 pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tingkatkan Efisiensi Debugging Anda</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Siap Memulai Analisis Bug Berbasis AI Hari Ini?
        </h2>

        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          Hubungkan repositori proyek Anda dan rasakan kemudahan penelusuran bug terverifikasi secara instan.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base px-8 shadow-lg">
            <Link href="/register" className="flex items-center gap-2">
              <span>Daftar Akun Baru</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white">
            <Link href="/login">Masuk ke Akun</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
