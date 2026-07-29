"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

/**
 * Landing Page CTA Section component.
 * Open, high-impact minimalist section.
 */
export function CtaSection() {
  return (
    <section className="py-24 lg:py-32 bg-background text-foreground relative overflow-hidden transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
          Siap Memulai Analisis Bug Berbasis AI?
        </h2>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Hubungkan repositori proyek Anda dan rasakan kemudahan penelusuran bug terverifikasi secara instan.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-base px-8 h-12 rounded-xl shadow-lg hover:shadow-orange-500/20 transition-all">
            <Link href="/register">Daftar Akun Baru</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 h-12 rounded-xl px-6">
            <Link href="/login">Masuk ke Akun</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
