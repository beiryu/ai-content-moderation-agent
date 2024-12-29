import Link from "next/link"

import { env } from "@/env.mjs"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"

async function getGitHubStars(): Promise<string | null> {
  try {
    const response = await fetch("https://api.github.com/repos/letstalkwise", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.GITHUB_ACCESS_TOKEN}`,
      },
      next: {
        revalidate: 60,
      },
    })

    if (!response?.ok) {
      return null
    }

    const json = await response.json()

    return parseInt(json["stargazers_count"]).toLocaleString()
  } catch (error) {
    return null
  }
}

export default async function IndexPage() {
  const stars = await getGitHubStars()

  return (
    <>
      <section
        id="hero"
        className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32"
      >
        <div className="container flex max-w-5xl flex-col items-center gap-4 text-center">
          <Link
            href={siteConfig.links.linkedin}
            className="rounded-2xl bg-muted px-4 py-1.5 text-sm font-medium"
            target="_blank"
          >
            Follow along on LinkedIn
          </Link>
          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
            Unlock Your Interview Superpowers with AI,
            <br />
            Your AI-Powered Interview
          </h1>
          <p className="max-w-2xl leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Master your interview skills with AI-powered practice sessions,
            instant feedback, and personalized coaching. Let&apos;s Talk Wise
            helps you prepare for your dream job with cutting-edge technology.
          </p>
          <div className="space-x-4">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Get Started
            </Link>
            {/* <Link
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              GitHub
            </Link> */}
          </div>
        </div>
      </section>
      <section
        id="features"
        className="container space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24"
      >
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Features
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Let&apos;s Talk Wise is an app that helps you have more effective
            meetings using AI technology.
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-5xl md:grid-cols-3">
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Icons.messageSquare className="size-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Real-time AI Feedback</h3>
                <p className="text-sm text-muted-foreground">
                  Instant feedback on responses and body language during
                  interviews.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Icons.tv className="size-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Smart Meeting Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered note-taking and real-time meeting insights.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Icons.contact className="size-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Personalized Coaching</h3>
                <p className="text-sm text-muted-foreground">
                  Custom preparation plans tailored to your industry.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Icons.fileBarChart2 className="size-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Performance Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Track your progress with detailed communication insights.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Icons.bookOpenCheck className="size-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Mock Interviews</h3>
                <p className="text-sm text-muted-foreground">
                  Practice with AI interviewers across industries.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Icons.fileText className="size-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Meeting Summaries</h3>
                <p className="text-sm text-muted-foreground">
                  Auto-generated transcripts and key action items.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto text-center md:max-w-[58rem]">
          <p className="leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Let&apos;s Talk Wise also includes a blog and a full-featured
            documentation site built using Contentlayer and MDX.
          </p>
        </div>
      </section>
      <section id="open-source" className="container py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Let&apos;s Talk Wise
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Let&apos;s Talk Wise is an app that helps you have more effective
            meetings using AI technology.
          </p>
        </div>
      </section>
    </>
  )
}
