import { LandingNav } from "@/components/sentinel/landing-nav"
import { HeroSection } from "@/components/sentinel/hero-section"
import { FeaturesSection } from "@/components/sentinel/features-section"
import { TestimonialsSection } from "@/components/sentinel/testimonials-section"
import { PricingSection } from "@/components/sentinel/pricing-section"
import { FooterSection } from "@/components/sentinel/footer-section"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <FooterSection />
    </div>
  )
}
