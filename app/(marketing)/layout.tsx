import Link from "next/link"
import { notFound } from "next/navigation"

import { marketingConfig } from "@/config/marketing"
import { getCurrentUser } from "@/lib/session"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Banner } from "@/components/banner"
import { MainNav } from "@/components/main-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { SiteFooter } from "@/components/site-footer"
import SmoothScrolling from "@/components/smooth-scroll"
import { UserAccountNav } from "@/components/user-account-nav"

interface MarketingLayoutProps {
  children: React.ReactNode
}

export default async function MarketingLayout({
  children,
}: MarketingLayoutProps) {
  const user = await getCurrentUser()

  return (
    <SmoothScrolling>
      <div className="flex min-h-screen flex-col">
        <Banner />
        <header className="z-40 sticky top-0 backdrop-blur-sm bg-black/100">
          <div className="flex h-20 container items-center justify-between py-6">
            <MainNav items={marketingConfig.mainNav} />
            {user ? (
              <UserAccountNav
                user={{
                  name: user.name,
                  image: user.image,
                  email: user.email,
                }}
              />
            ) : (
              <nav>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "px-4"
                  )}
                >
                  Login
                </Link>
              </nav>
            )}
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </SmoothScrolling>
  )
}
