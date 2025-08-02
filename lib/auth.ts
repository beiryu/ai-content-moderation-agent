import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import EmailProvider from "next-auth/providers/email"
import GitHubProvider from "next-auth/providers/github"
import { Resend } from "resend"

import { env } from "@/env.mjs"
import { siteConfig } from "@/config/site"
import { db } from "@/lib/db"
import { EmailTemplate } from "@/components/email-template"

const resend = new Resend(env.RESEND_API_KEY)

export const authOptions: NextAuthOptions = {
  // huh any! I know.
  // This is a temporary fix for prisma client.
  // @see https://github.com/prisma/prisma/issues/16117
  adapter: PrismaAdapter(db as any),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
    EmailProvider({
      from: env.SMTP_FROM,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const user = await db.user.findUnique({
          where: {
            email: identifier,
          },
          select: {
            emailVerified: true,
          },
        })

        // Determine email type based on whether user is verified
        const emailType = user?.emailVerified ? "sign-in" : "activation"

        // Create email subject based on email type
        const subject = user?.emailVerified
          ? `Sign in to ${siteConfig.name}`
          : `Activate your ${siteConfig.name} account`

        // Send email using Resend with React template
        const { error } = await resend.emails.send({
          from: provider.from as string,
          to: identifier,
          subject: subject,
          react: EmailTemplate({
            type: emailType as "sign-in" | "activation",
            url,
            productName: siteConfig.name,
          }),
          headers: {
            // Set this to prevent Gmail from threading emails
            "X-Entity-Ref-ID": new Date().getTime() + "",
          },
        })

        if (error) {
          throw new Error(error.message)
        }
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.picture
      }

      return session
    },
    async jwt({ token, user }) {
      const dbUser = await db.user.findFirst({
        where: {
          email: token.email,
        },
      })

      if (!dbUser) {
        if (user) {
          token.id = user?.id
        }
        return token
      }

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      }
    },
  },
}
