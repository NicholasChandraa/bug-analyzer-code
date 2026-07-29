"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

/**
 * Landing Page Hero Section component.
 * Editorial, high-impact centered layout with wide showcase preview.
 */
export function HeroSection() {
  return (
    <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-orange-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        {/* Main Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-slate-900 dark:text-white">
          Debug Codebase Instan. <br />
          <span className="text-orange-500 font-semibold">Perbaikan Kode Terverifikasi.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-normal max-w-2xl mx-auto leading-relaxed">
          Pindai repositori lokal, temukan akar masalah hingga baris kode spesifik, dan dapatkan rekomendasi patch yang sudah diuji otomatis.
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-base px-8 h-12 rounded-xl shadow-lg hover:shadow-orange-500/20 transition-all">
            <Link href="/login">Mulai Triage Kode</Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 h-12 rounded-xl px-6">
            <a href="#fitur">Pelajari Sistem</a>
          </Button>
        </div>

        {/* Hero Product Showcase Frame */}
        <div className="pt-10 max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 p-2 shadow-2xl backdrop-blur-xl">
            <div className="relative rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800/60">
              <Image
                src="/hero_ai_companion.jpg"
                alt="Smart Bug Triage AI Companion"
                width={1200}
                height={675}
                className="w-full h-auto object-cover object-center rounded-xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
