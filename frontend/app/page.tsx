import { LandingNavbar } from "@/domains/landing/components/landing-navbar"
import { HeroSection } from "@/domains/landing/components/hero-section"
import { FeatureSection } from "@/domains/landing/components/feature-section"
import { PhonePreviewSection } from "@/domains/landing/components/phone-preview-section"
import { HowItWorksSection } from "@/domains/landing/components/how-it-works-section"
import { CtaSection } from "@/domains/landing/components/cta-section"
import { LandingFooter } from "@/domains/landing/components/landing-footer"

/**
 * Next.js Router Page: Landing Page (root route `/`)
 * Assembles modern, responsive, light/dark mode domain landing components.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-amber-500 selection:text-slate-950 transition-colors duration-300">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeatureSection />
        <PhonePreviewSection />
        <HowItWorksSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  )
}
