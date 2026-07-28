"use client"

import { FolderGit2, MessageSquareCode, ShieldCheck, CheckCircle2 } from "lucide-react"

/**
 * Landing Page How It Works Section component.
 * Displays 4-step interactive workflow.
 */
export function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Pilih Repositori Target",
      description: "Pilih repositori lokal atau remote yang ingin dianalisis oleh AI Agent.",
      icon: FolderGit2,
      color: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    },
    {
      number: "02",
      title: "Kirim Laporan Bug",
      description: "Masukkan pesan kesalahan, stack trace, atau deskripsi bug yang dialami.",
      icon: MessageSquareCode,
      color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10",
    },
    {
      number: "03",
      title: "AI Trace & Docker Sandbox Test",
      description: "Agen AI melacak kode via Ripgrep dan menguji perbaikan di kontainer Docker terisolasi.",
      icon: ShieldCheck,
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    },
    {
      number: "04",
      title: "Patch Terverifikasi",
      description: "Dapatkan diff perbaikan kode yang sudah lulus kompilasi & siap untuk di-merge.",
      icon: CheckCircle2,
      color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/10",
    },
  ]

  return (
    <section id="alur-kerja" className="py-20 lg:py-28 bg-slate-950 text-white border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
            Alur Kerja Sederhana
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            4 Langkah Mudah Menuju Perbaikan Kode.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-normal">
            Proses otomatis yang intuitif dari awal hingga rekomendasi patch teruji.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const IconComponent = step.icon
            return (
              <div
                key={step.number}
                className="relative rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 hover:border-slate-700 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${step.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-black font-mono text-slate-700">{step.number}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
