"use client"

import Link from "next/link"
import Image from "next/image"
import logo from "@/public/logo.png"
import { Button } from "@/components/ui/button"
import { ArrowRight, LayoutDashboard } from "lucide-react"

/**
 * Landing Page Navbar component.
 * Features logo branding, navigation links, and login/register/dashboard CTA buttons.
 */
export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-1.5 rounded-xl bg-white/10 border border-white/15 group-hover:bg-white/15 transition-colors">
            <Image src={logo} alt="Logo" className="w-6 h-6 object-contain" priority />
          </div>
          <span className="text-lg font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
            Smart Bug Triage
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#fitur" className="hover:text-white transition-colors">
            Fitur Utama
          </a>
          <a href="#alur-kerja" className="hover:text-white transition-colors">
            Alur Kerja
          </a>
          <a href="#arsitektur" className="hover:text-white transition-colors">
            Arsitektur Engine
          </a>
        </nav>

        {/* Auth CTA Buttons */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800/60">
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-sm">
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
