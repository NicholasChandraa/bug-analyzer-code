import Image from "next/image"
import Link from "next/link"
import { LoginForm } from "@/domains/auth/components/login-form"
import logo from "@/public/logo.png"
import darkHeroBg from "@/public/dark-hero-bg.jpg"
import mascotImg from "@/public/mascot.jpg"

/**
 * Next.js Router Page: Login
 * Clean split-screen layout with return-to-landing-page button.
 */
export default function LoginPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-background">
      {/* Left Branding Showcase Column */}
      <div className="lg:col-span-6 xl:col-span-6 bg-slate-950 text-white relative overflow-hidden flex flex-col justify-between p-8 sm:p-10 lg:p-14 border-r border-slate-800/60">
        {/* Subtle Ambient Background Texture */}
        <Image
          src={darkHeroBg}
          alt="Abstract ambient background"
          fill
          className="object-cover object-center opacity-20 mix-blend-luminosity pointer-events-none"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/90 to-slate-950 pointer-events-none" />

        {/* Top Branding Header with Return Button */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/20 transition-colors">
              <Image src={logo} alt="Logo" className="w-7 h-7 object-contain" priority />
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">Smart Bug Triage</span>
          </Link>

          <Link href="/" className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-colors">
            &larr; Kembali ke Beranda
          </Link>
        </div>

        {/* Center Hero Content Block */}
        <div className="relative z-10 my-auto py-6 space-y-5 max-w-md mx-auto w-full">
          <div className="space-y-3 text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-white">
              Analisis Bug & Perbaikan Kode{" "}
              <span className="text-amber-500">Terverifikasi.</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
              Agen AI otonom yang memindai repositori lokal server, menemukan akar masalah, dan memverifikasi patch di Docker Sandbox.
            </p>
          </div>

          {/* Clean Mascot Image Card */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900/40 w-full">
            <Image
              src={mascotImg}
              alt="Cute 3D AI Mascot"
              className="w-full h-auto max-h-[300px] object-cover object-center rounded-2xl"
              priority
            />
          </div>
        </div>

        {/* Minimalist Footer */}
        <div className="relative z-10 border-t border-white/10 pt-4 text-xs text-slate-500">
          Smart Bug Triage AI Platform &bull; Autonomous Agent Engine
        </div>
      </div>

      {/* Right Form Column */}
      <div className="lg:col-span-6 xl:col-span-6 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 bg-background relative">
        {/* Mobile top return link */}
        <div className="w-full max-w-md flex justify-end mb-4 lg:hidden">
          <Link href="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            &larr; Kembali ke Landing Page
          </Link>
        </div>

        <LoginForm />
      </div>
    </main>
  )
}
