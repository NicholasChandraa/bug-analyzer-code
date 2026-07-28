"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRegister } from "../hooks/use-register"
import { User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from "lucide-react"

/**
 * Modern RegisterForm UI Component (Auth Domain).
 * Features input icons, password visibility toggle, and clear loading/error feedback.
 */
export function RegisterForm() {
  const { register, error, isPending } = useRegister()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password || isPending) return
    register({ name, email, password })
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Buat Akun Baru</h2>
        <p className="text-sm text-muted-foreground">
          Lengkapi data di bawah ini untuk memulai analisis bug otomatis dengan AI.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-medium">Nama Lengkap</Label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Anda"
              className="pl-9 h-10 text-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium">Alamat Email</Label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="pl-9 h-10 text-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium">Kata Sandi</Label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="pl-9 pr-10 h-10 text-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-full h-10 text-sm font-semibold mt-2">
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mendaftarkan...
            </>
          ) : (
            <>
              Daftar Akun Sekarang <ArrowRight className="w-4 h-4 ml-1.5" />
            </>
          )}
        </Button>
      </form>

      <div className="pt-2 text-center text-xs text-muted-foreground border-t">
        Sudah memiliki akun?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline underline-offset-4">
          Masuk di Sini
        </Link>
      </div>
    </div>
  )
}
