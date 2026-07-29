"use client"

import Image from "next/image"

/**
 * Landing Page Mobile / Phone Showcase Section.
 * Editorial split layout for multi-device triage insights.
 */
export function PhonePreviewSection() {
  return (
    <section id="mobile-triage" className="py-20 lg:py-28 bg-background text-foreground transition-colors duration-300 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Editorial Headline & Narrative */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              Akses Triage Kapan Saja, Di Mana Saja.
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
              Antarmuka responsif yang disesuaikan secara khusus untuk perangkat mobile maupun desktop. Tinjau diff perbaikan kode, status tes, dan pesan obrolan agen AI dengan nyaman.
            </p>

            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-900 dark:text-white">Real-Time Mobile Notifications</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Pemberitahuan otomatis saat sesi triage selesai diuji di Docker.</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-900 dark:text-white">Review Code Diff Ringkas</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Inspeksi usulan patch per baris kode langsung dari layar smartphone.</div>
              </div>
            </div>
          </div>

          {/* Right Column: Phone Visual Showcase */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 shadow-2xl backdrop-blur-xl">
              <Image
                src="/app_mobile_preview.jpg"
                alt="Mobile App Preview for Bug Analyzer"
                width={600}
                height={480}
                className="w-full h-auto object-cover object-center rounded-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
