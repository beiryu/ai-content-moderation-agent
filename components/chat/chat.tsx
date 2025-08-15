"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useChatDocumentStore } from "@/stores/chat-document-store"
import { FileText, Paperclip, Send, X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  useRagChatMessages,
  useSendRagChatMessage,
} from "@/hooks/api/chat/useRagChatMessages"
import { useGetDocuments } from "@/hooks/api/document/useGetDocuments"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { ChatMessage } from "@/components/chat/chat-message"

import { Icons } from "../icons"
import { toast } from "../ui/use-toast"

export default function Chat() {
  const {
    selectedDocuments,
    deselectDocument,
    activeSessionId,
    setActiveSession,
  } = useChatDocumentStore()

  const { documents } = useGetDocuments()
  const selectedDocumentDetails =
    documents?.filter((doc) => selectedDocuments.includes(doc.id)) || []

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState("")

  const router = useRouter()

  // Use the new hooks with proper refetching
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useRagChatMessages(activeSessionId)
  const { mutate: sendMessage, isPending: isSending } = useSendRagChatMessage()

  // Combined loading state
  const isLoading = isLoadingMessages || isSending

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      )
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, isLoading])

  // Ensure messages are up-to-date when activeSessionId changes
  useEffect(() => {
    if (activeSessionId) {
      refetchMessages()
    }
  }, [activeSessionId, refetchMessages])

  const handleSendMessage = () => {
    if (!message.trim() || selectedDocuments.length === 0 || isLoading) return

    const trimmedMessage = message.trim()
    setMessage("")

    sendMessage(
      {
        message: trimmedMessage,
        selectedDocuments,
        sessionId: activeSessionId,
        options: {
          includeCitations: true,
          tonePreference: "professional",
        },
      },
      {
        onSuccess: (chatResponse) => {
          // Set the session ID if this is a new conversation
          if (!activeSessionId && chatResponse.conversationId) {
            setActiveSession(chatResponse.conversationId)
            // Update URL with the session ID
            router.push(`?sessionId=${chatResponse.conversationId}`)
          }
        },
        onError: (error) => {
          toast({
            title: "Error sending message",
            description: error.message,
            variant: "destructive",
          })
          console.error("Error sending message:", error)
        },
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="inline-flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h3 className="font-medium">RAG Chat</h3>
        </div>
        <div className="flex items-center">
          <div className="inline-flex items-center bg-muted rounded-full border text-xs py-1 px-3 text-muted-foreground">
            <span className="mr-1">{selectedDocuments.length}</span>
            document{selectedDocuments.length !== 1 ? "s" : ""} selected
          </div>
        </div>
      </div>

      {/* Conversation Area with ScrollArea */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center p-8">
              <FileText className="size-10 text-primary/60 mb-4" />
              <h3 className="text-lg font-medium mb-2">Document Assistant</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {selectedDocuments.length === 0
                  ? "Please select documents to begin analyzing your content with advanced retrieval augmented generation."
                  : `Ready to analyze ${selectedDocuments.length} document${
                      selectedDocuments.length > 1 ? "s" : ""
                    }.`}
              </p>
              {selectedDocuments.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Ask questions about your documents to get AI-powered insights.
                </p>
              )}
            </div>
          )}

          {/* Display chat messages */}
          {messages.map((msg) =>
            msg.role === "user" ? (
              <ChatMessage key={msg.id} isUser={true}>
                <p>{msg.content}</p>
              </ChatMessage>
            ) : (
              <ChatMessage key={msg.id} isUser={false} content={msg.content}>
                <div className="space-y-2">
                  <p>{msg.content}</p>
                  {/* Error handling for optimistic updates happens in the hook */}

                  {/* Show sources for assistant messages */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Sources ({msg.sources.length}):
                      </p>
                      <div className="space-y-2">
                        {msg.sources.slice(0, 3).map((source: any, index) => (
                          <div
                            key={index}
                            className="text-xs bg-muted p-2 rounded border-l-2 border-primary/30"
                          >
                            <div className="font-medium">
                              {source.documentTitle}
                            </div>
                            <div className="text-muted-foreground whitespace-pre-wrap mt-1">
                              {source.chunkContent.substring(0, 100)}...
                            </div>
                            <div className="text-muted-foreground mt-1">
                              Relevance:{" "}
                              {(source.relevanceScore * 100).toFixed(0)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ChatMessage>
            )
          )}

          {/* Loading indicator */}
          {isSending && (
            <ChatMessage isUser={false}>
              <div className="flex items-center space-x-2">
                <Icons.spinner className="size-6 animate-spin" />
                <span>Processing...</span>
              </div>
            </ChatMessage>
          )}
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="p-4 border-t border-border">
        <div className="mx-auto">
          {/* Selected Documents Context */}
          {selectedDocuments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-2">
              {selectedDocumentDetails.map((doc) => (
                <Badge
                  key={doc.id}
                  variant="outline"
                  className="bg-muted/50 text-xs flex items-center gap-1 pl-1.5 pr-1 py-0.5 h-6"
                >
                  <FileText className="size-3 mr-1 text-muted-foreground" />
                  <span className="truncate max-w-[120px]">{doc.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-4 p-0 ml-1 hover:bg-transparent hover:text-foreground rounded-full"
                    onClick={() => deselectDocument(doc.id)}
                  >
                    <X className="size-3" />
                    <span className="sr-only">Remove {doc.title}</span>
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          <div className="relative rounded-lg border bg-background transition-colors focus-within:ring-1 focus-within:ring-ring">
            <Textarea
              className={cn(
                "w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                "min-h-10 p-3"
              )}
              placeholder={
                selectedDocuments.length === 0
                  ? "Select documents, then ask questions..."
                  : "Ask questions about your documents..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={selectedDocuments.length === 0 || isLoading}
            />

            {/* Input Actions */}
            <div className="flex items-center justify-between gap-2 p-2 pt-0">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 rounded-full text-muted-foreground"
                  title="Attach document"
                  disabled={selectedDocuments.length === 0}
                >
                  <Paperclip className="size-4" />
                  <span className="sr-only">Attach</span>
                </Button>
              </div>
              <Button
                size="sm"
                className={cn("h-8 px-3", !message.trim() && "opacity-70")}
                disabled={
                  !message.trim() || selectedDocuments.length === 0 || isLoading
                }
                onClick={handleSendMessage}
              >
                {isLoading ? (
                  <>
                    <Icons.spinner className="size-6 animate-spin mr-1.5" />
                    Processing
                  </>
                ) : (
                  <>
                    <Send className="size-4 mr-1.5" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
