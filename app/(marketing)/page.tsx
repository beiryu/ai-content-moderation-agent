import { CallToAction } from "@/components/call-to-action"
import { FAQs } from "@/components/faqs"
import { Features } from "@/components/features"
import { Hero } from "@/components/hero"
import { LogoTicker } from "@/components/logo-ticker"
import { ProductShowcase } from "@/components/product-showcase"

export default async function IndexPage() {
  return (
    <div className="bg-black text-white overflow-clip">
      <Hero />
      <LogoTicker />
      <Features />
      <ProductShowcase />
      <FAQs />
      <CallToAction />
    </div>
  )
}
