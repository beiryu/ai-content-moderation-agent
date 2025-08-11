import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { getCurrentUser } from "@/lib/session"
import { Card } from "@/components/ui/card"
import ChatWithDocuments from "@/components/chat/chat-with-documents"
import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"

export const metadata: Metadata = {
  title: "Document Chat - AI Content Moderation Agent",
  description: "Chat with your uploaded documents using AI assistant.",
}

export default async function DocumentChatPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect(authOptions?.pages?.signIn || "/login")
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Document Chat"
        text="Ask questions and get insights from your uploaded documents."
      />
      <Card className="h-[calc(100vh-12rem)] overflow-hidden bg-background p-0">
        <ChatWithDocuments />
      </Card>
    </DashboardShell>
  )
}
