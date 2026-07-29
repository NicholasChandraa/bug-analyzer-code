"use client"

/**
 * Landing Page How It Works Section component.
 * Minimal linear workflow list without boxy card containers.
 */
export function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Pilih Repositori Target",
      description: "Pilih repositori lokal atau remote yang ingin dianalisis oleh AI Agent.",
    },
    {
      number: "02",
      title: "Kirim Laporan Bug",
      description: "Masukkan pesan kesalahan, stack trace, atau deskripsi bug yang dialami.",
    },
    {
      number: "03",
      title: "AI Trace & Docker Sandbox",
      description: "Agen AI melacak kode via Ripgrep dan menguji perbaikan di kontainer Docker terisolasi.",
    },
    {
      number: "04",
      title: "Patch Terverifikasi",
      description: "Dapatkan diff perbaikan kode yang sudah lulus kompilasi & siap untuk di-merge.",
    },
  ]

  return (
    <section id="alur-kerja" className="py-20 lg:py-28 bg-slate-100/60 dark:bg-[#0b0f19] text-slate-900 dark:text-white border-t border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="max-w-xl text-left space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            4 Langkah Mudah Menuju Perbaikan Kode.
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
            Alur kerja yang mulus dari laporan bug hingga rekomendasi patch yang sudah diuji.
          </p>
        </div>

        {/* Minimal Linear Flow Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative border-t border-slate-200 dark:border-slate-800 pt-8">
          {steps.map((step) => (
            <div key={step.number} className="space-y-3">
              <span className="text-2xl font-bold font-mono text-amber-500">{step.number}</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{step.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
