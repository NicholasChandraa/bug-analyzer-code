import { LandingNavbar } from "@/domains/landing/components/landing-navbar"
import { HeroSection } from "@/domains/landing/components/hero-section"
import { FeatureSection } from "@/domains/landing/components/feature-section"
import { HowItWorksSection } from "@/domains/landing/components/how-it-works-section"
import { CtaSection } from "@/domains/landing/components/cta-section"
import { LandingFooter } from "@/domains/landing/components/landing-footer"

/**
 * Next.js Router Page: Landing Page (root route `/`)
 * Assembles domain landing components according to Semi-DDD principles.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-amber-500 selection:text-slate-950">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeatureSection />
        <HowItWorksSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  )
}
