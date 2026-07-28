"use client"

import Image from "next/image"
import logo from "@/public/logo.png"

/**
 * Landing Page Footer component.
 * Displays logo, copyright notice, and links.
 */
export function LandingFooter() {
  return (
    <footer id="arsitektur" className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
        {/* Left Brand */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-white/10 border border-white/15">
            <Image src={logo} alt="Logo" className="w-5 h-5 object-contain" />
          </div>
          <span className="font-semibold text-white">Smart Bug Triage AI</span>
          <span className="text-slate-600">|</span>
          <span>Restack Pattern Monorepo (Next.js 16 & Hono)</span>
        </div>

        {/* Right Copyright */}
        <div className="text-slate-500 text-center md:text-right">
          &copy; {new Date().getFullYear()} Smart Bug Triage. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
