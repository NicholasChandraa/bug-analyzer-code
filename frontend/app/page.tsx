import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import logo from "@/public/logo.png"

/**
 * Next.js Router Page: Landing Page (root)
 * 
 * Semi-DDD rules:
 * - Files in `frontend/app/` are strictly for layout, routing config, metadata, or entry gates.
 * - Do not implement custom JSX layouts, forms, state, or complex components here.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="text-center max-w-md">
        <Image src={logo} alt="Logo" className="w-16 h-auto mx-auto mb-4 object-contain" priority />
        <h1 className="text-4xl font-semibold tracking-tight">RestackPattern</h1>
        <p className="mt-3 text-muted-foreground text-lg">
          Full-stack monorepo starter with Next.js, Hono, and Drizzle ORM.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
