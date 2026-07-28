"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLogin } from "../hooks/use-login"
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from "lucide-react"

/**
 * Modern LoginForm UI Component (Auth Domain).
 * Features input icons, password visibility toggle, and clear loading/error feedback.
 */
export function LoginForm() {
  const { login, error, isPending } = useLogin()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || isPending) return
    login({ email, password })
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Masuk ke Akun Anda</h2>
        <p className="text-sm text-muted-foreground">
          Masukkan email dan kata sandi Anda untuk mengakses Smart Bug Triage Dashboard.
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium">Kata Sandi</Label>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...
            </>
          ) : (
            <>
              Masuk Sekarang <ArrowRight className="w-4 h-4 ml-1.5" />
            </>
          )}
        </Button>
      </form>

      <div className="pt-2 text-center text-xs text-muted-foreground border-t">
        Belum memiliki akun?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline underline-offset-4">
          Daftar Akun Baru
        </Link>
      </div>
    </div>
  )
}
