"use client"

import Link from "next/link"
import Image from "next/image"
import logo from "@/public/logo.png"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * Landing Page Navbar component.
 * Minimalist design without cluttered icon decoration.
 */
export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#090d16]/80 backdrop-blur-xl transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-1 rounded-lg bg-orange-500/10 border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors">
            <Image src={logo} alt="Logo" className="w-5 h-5 object-contain" priority />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">
            Smart Bug Triage
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
          <a href="#fitur" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Fitur Utama
          </a>
          <a href="#mobile-triage" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Mobile Insight
          </a>
          <a href="#alur-kerja" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Alur Kerja
          </a>
        </nav>

        {/* Auth & Theme Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm">
            <Link href="/dashboard">
              <span>Dashboard</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
