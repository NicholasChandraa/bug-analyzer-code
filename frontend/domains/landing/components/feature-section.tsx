"use client"

import Image from "next/image"

/**
 * Landing Page Feature Section component.
 * Bento Box asymmetric grid layout for a modern, non-AI-slop aesthetic.
 */
export function FeatureSection() {
  return (
    <section id="fitur" className="py-20 lg:py-28 bg-slate-100/60 dark:bg-[#0b0f19] text-slate-900 dark:text-white border-t border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="max-w-xl text-left space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Teknologi Triage & Sandbox Terintegrasi.
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
            Arsitektur ReAct Agent yang dipadukan dengan mesin pencari simbol lokal dan sandbox terisolasi.
          </p>
        </div>

        {/* Bento Box Asymmetric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bento Item 1: Wide Card (Spans 2 Columns) */}
          <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-8 space-y-6 shadow-sm hover:border-amber-600/30 transition-colors flex flex-col justify-between">
            <div className="space-y-3 max-w-lg">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Fast Ripgrep Code Trace</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Memindai ribuan berkas codebase dan riwayat Git commit berkecepatan tinggi langsung di disk lokal tanpa batasan token context window.
              </p>
            </div>

            {/* Code Snippet Visual Accent */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#060911] p-4 font-mono text-xs text-slate-700 dark:text-slate-300 space-y-1.5 overflow-x-auto">
              <div className="text-slate-400">$ ripgrep --type ts &quot;function calculateTotal&quot;</div>
              <div className="text-amber-600 dark:text-amber-400">src/services/checkout.ts:42: export function calculateTotal(items: CartItem[])</div>
              <div className="text-slate-500">&rarr; Matched symbol definition in 4.2ms</div>
            </div>
          </div>

          {/* Bento Item 2: Tall Card (Spans 1 Column) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-8 space-y-6 shadow-sm hover:border-emerald-500/30 transition-colors flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Automated Test Verification</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Setiap usulan patch perbaikan diuji secara otomatis via compiler & unit test runner sebelum direkomendasikan.
              </p>
            </div>

            {/* Test Status Indicators */}
            <div className="space-y-2 pt-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span>tsc --noEmit</span>
                <span className="text-emerald-500 font-bold">PASSED</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span>npm test -- checkout</span>
                <span className="text-emerald-500 font-bold">12/12 PASSED</span>
              </div>
            </div>
          </div>

          {/* Bento Item 3: Full Width Showcase Banner (Spans 3 Columns) */}
          <div className="md:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-sm">
            <div className="lg:col-span-6 space-y-4 text-left">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Real-time Streaming & Reasoning Loop.
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Pantau alur berpikir To-Do list agen AI dan pembentukan rekomendasi patch secara live via Server-Sent Events tanpa delay.
              </p>
            </div>

            <div className="lg:col-span-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <Image
                src="/ai_triage_dashboard.jpg"
                alt="Real-time AI Reasoning Loop Dashboard"
                width={700}
                height={400}
                className="w-full h-auto object-cover object-center rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
