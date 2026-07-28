"use client"

import Link from "next/link"
import Image from "next/image"
import mascotImg from "@/public/mascot-register.jpg"
import darkHeroBg from "@/public/dark-hero-bg.jpg"
import { Button } from "@/components/ui/button"
import { ArrowRight, Terminal, ShieldCheck } from "lucide-react"

/**
 * Landing Page Hero Section component.
 * Features ultra-clean typography, solid orange keyword accent, CTA buttons,
 * and cute 3D AI Astronaut Mascot artwork showcase card.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-950 py-20 lg:py-28 text-white border-b border-slate-800/60">
      {/* Background Texture */}
      <Image
        src={darkHeroBg}
        alt="Abstract background"
        fill
        className="object-cover object-center opacity-15 mix-blend-luminosity pointer-events-none"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300 backdrop-blur-md">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Autonomous AI Agent Engine v2.0</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12] text-white">
              Analisis Bug & Perbaikan Kode{" "}
              <span className="text-amber-500">Terverifikasi.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal max-w-xl">
              Platform AI otonom yang memindai repositori lokal server, melacak akar masalah hingga baris kode spesifik, dan menguji perbaikan di dalam Docker Sandbox.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base px-6 shadow-md">
                <Link href="/login" className="flex items-center gap-2">
                  <span>Mulai Triage Kode</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white">
                <a href="#fitur" className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Pelajari Fitur</span>
                </a>
              </Button>
            </div>
          </div>

          {/* Right Cute Mascot Showcase Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-slate-900/40 p-2 backdrop-blur-md">
              <div className="relative rounded-xl overflow-hidden">
                <Image
                  src={mascotImg}
                  alt="Cute 3D AI Astronaut Mascot"
                  className="w-full h-auto max-h-[380px] object-cover object-center rounded-xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
