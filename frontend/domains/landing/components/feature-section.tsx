"use client"

import Image from "next/image"
import mascotFluffy from "@/public/mascot.jpg"
import { Search, ShieldCheck, Zap, Code2, Terminal, Cpu } from "lucide-react"

/**
 * Landing Page Feature Section component.
 * Features 3 core pillar features with cute 3D mascot artwork & sleek developer UI cards.
 */
export function FeatureSection() {
  return (
    <section id="fitur" className="py-20 lg:py-28 bg-slate-950 text-white border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
            Fitur Utama
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Dirancang Khusus untuk Developer & Tim Engineering.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-normal">
            Kombinasi pencarian Ripgrep lokal, ReAct Agent reasoning, dan verifikasi otomatis di Docker Sandbox.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1: Ripgrep Code Search */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Fast Ripgrep Code Trace</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Memindai ribuan berkas codebase dan riwayat Git commit berkecepatan tinggi langsung di disk lokal tanpa batasan token.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-slate-500 border-t border-slate-800/80">
              <Terminal className="w-3.5 h-3.5 text-amber-500" />
              <span>Pencarian simbol & stack trace instan</span>
            </div>
          </div>

          {/* Feature 2: Docker Verification Sandbox */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Docker Verification Sandbox</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Setiap usulan patch perbaikan kode diuji secara ketat via compiler & unit test runner di dalam kontainer terisolasi sebelum direkomendasikan.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-slate-500 border-t border-slate-800/80">
              <Code2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verifikasi kompilasi `tsc --noEmit` & `lint`</span>
            </div>
          </div>

          {/* Feature 3: Real-time ReAct Agent Streaming */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Real-time SSE Streaming</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Pantau alur berpikir To-Do list agen AI dan pembentukan rekomendasi patch secara live tanpa delay.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-slate-500 border-t border-slate-800/80">
              <Cpu className="w-3.5 h-3.5 text-cyan-500" />
              <span>ReAct loop reasoning & action streaming</span>
            </div>
          </div>
        </div>

        {/* Cute Mascot Showcase Section Banner */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-8 flex flex-col md:flex-row items-center gap-8 shadow-xl">
          <div className="w-full md:w-64 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-lg">
            <Image
              src={mascotFluffy}
              alt="Cute 3D AI Fluffy Mascot"
              className="w-full h-auto max-h-[220px] object-cover object-center rounded-xl"
            />
          </div>
          <div className="space-y-3 text-left">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Asisten AI Handal
            </span>
            <h3 className="text-2xl font-bold text-white">
              Tidak Ada Lagi Debugging Manual yang Menyita Waktu.
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Biarkan AI Agent memetakan masalah, mengeksekusi tes, dan memberi rekomendasi perbaikan kode secara otomatis untuk Anda.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
