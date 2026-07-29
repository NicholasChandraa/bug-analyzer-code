"use client"

import Link from "next/link"
import Image from "next/image"
import logo from "@/public/logo.png"

/**
 * Landing Page Footer component.
 * Minimalist design with theme-adaptive text and branding.
 */
export function LandingFooter() {
  return (
    <footer className="bg-slate-100/80 dark:bg-[#060910] text-slate-600 dark:text-slate-400 py-12 border-t border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Image src={logo} alt="Logo" className="w-5 h-5 object-contain" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            Smart Bug Triage AI
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-xs font-medium">
          <a href="#fitur" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Fitur
          </a>
          <a href="#mobile-triage" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Mobile Insight
          </a>
          <a href="#alur-kerja" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Alur Kerja
          </a>
          <Link href="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Masuk
          </Link>
        </div>

        {/* Copyright */}
        <div className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Smart Bug Triage. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
