import Image from "next/image"
import { RegisterForm } from "@/domains/auth/components/register-form"
import logo from "@/public/logo.png"

/**
 * Next.js Router Page: Register
 * 
 * Semi-DDD rules:
 * - Files in `frontend/app/` are strictly for layout, routing config, metadata, or entry gates.
 * - Do not implement custom JSX layouts, forms, state, or complex components here.
 * - Always import and delegate rendering to domain feature components (e.g. `<RegisterForm />`).
 */
export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="mb-8 text-center flex flex-col items-center">
        <Image src={logo} alt="Logo" className="w-12 h-auto mb-3 object-contain" priority />
        <h1 className="text-2xl font-semibold tracking-tight">RestackPattern</h1>
        <p className="text-sm text-muted-foreground mt-1">Full-stack monorepo starter</p>
      </div>
      <RegisterForm />
    </main>
  )
}
