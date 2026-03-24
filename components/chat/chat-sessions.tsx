"use client"

import { useRouter } from "next/navigation"
import { useChatDocumentStore } from "@/stores/chat-document-store"
import { FilePlus, MessageSquare, Plus } from "lucide-react"

import { cn, formatChatSessionDate, formatChatSessionTitle } from "@/lib/utils"
import { useConversations } from "@/hooks/api/chat/useChatMessages"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

import { Icons } from "../icons"

export default function ChatSessions() {
  const router = useRouter()

  const { activeSessionId, setActiveSession, clearActiveSession } =
    useChatDocumentStore()

  const { data: sessions } = useConversations()

  if (!sessions) {
    return (
      <div className="flex h-full flex-col">
        <div className="p-4 flex items-center justify-between">
          <h3 className="font-medium">Chat Sessions</h3>
          <Button
            variant="ghost"
            size="sm"
            className="size-8 p-0"
            onClick={() => {
              clearActiveSession()
              router.push("?")
            }}
          >
            <Plus className="size-4" />
            <span className="sr-only">New Session</span>
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Icons.spinner className="size-6 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 flex items-center justify-between">
        <h3 className="font-medium">Chat Sessions</h3>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={() => {
            clearActiveSession()
            router.push("?")
          }}
        >
          <Plus className="size-4" />
          <span className="sr-only">New Session</span>
        </Button>
      </div>

      {/* Session List */}
      <ScrollArea className="flex-1 p-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageSquare className="size-8 text-muted-foreground mb-2 opacity-50" />
            <h3 className="font-medium mb-1">No chat sessions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start a new conversation with your documents
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                clearActiveSession()
                router.push("?")
              }}
            >
              <FilePlus className="size-4" />
              New Chat
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  session.id === activeSessionId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
                onClick={() => {
                  setActiveSession(session.id)
                  router.push(`?sessionId=${session.id}`)
                }}
              >
                <MessageSquare className="size-4 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center w-full">
                    <div className="flex-1">
                      <p className="font-medium leading-none truncate min-w-0 flex-1 overflow-hidden">
                        {formatChatSessionTitle(session)}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground shrink-0 pl-2 whitespace-nowrap">
                      {formatChatSessionDate(session.updatedAt)}
                    </p>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {session._count.messages} messages
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
