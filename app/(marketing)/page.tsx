import { CallToAction } from "@/components/call-to-action"
import { FAQs } from "@/components/faqs"
import { Features } from "@/components/features"
import { Hero } from "@/components/hero"
import { LogoTicker } from "@/components/logo-ticker"
import { Pricing } from "@/components/pricing"
import { ProductShowcase } from "@/components/product-showcase"
import { Testimonials } from "@/components/testimonials"

export default async function IndexPage() {
  return (
    <div className="bg-black text-white text-clip">
      <Hero />
      <LogoTicker />
      <Features />
      <ProductShowcase />
      <Pricing />
      <Testimonials />
      <FAQs />
      <CallToAction />
    </div>
  )
}
