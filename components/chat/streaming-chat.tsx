"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useChatDocumentStore } from "@/stores/chat-document-store"
import { FileText, Paperclip, Send, Square, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Source, useRagChatMessages } from "@/hooks/api/chat/useRagChatMessages"
import { useStreamingRagChat } from "@/hooks/api/chat/useStreamingRagChat"
import { useGetDocuments } from "@/hooks/api/document/useGetDocuments"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { ChatMessage } from "@/components/chat/chat-message"

import { Icons } from "../icons"
import { toast } from "../ui/use-toast"

export default function StreamingChat() {
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

  // Use the existing hook for fetching messages
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useRagChatMessages(activeSessionId)

  // Use the new streaming hook
  const {
    sendMessage: sendStreamingMessage,
    isStreaming,
    currentStreamContent,
    streamingMessageId,
    hasStartedStreaming,
    cancelStream,
  } = useStreamingRagChat({
    onChunkReceived: (chunk) => {
      console.log("Received chunk:", chunk)
      // Auto-scroll on new chunk
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        )
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
    },
    onComplete: (completedMessage) => {
      console.log("Streaming complete:", completedMessage)

      // Set the session ID if this is a new conversation
      if (!activeSessionId && completedMessage.conversationId) {
        setActiveSession(completedMessage.conversationId)
        router.push(`?sessionId=${completedMessage.conversationId}`)
      }
    },
    onError: (error) => {
      toast({
        title: "Streaming error",
        description: error,
        variant: "destructive",
      })
    },
  })

  // Combined loading state
  const isLoading = isLoadingMessages || isStreaming

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
  }, [messages, isStreaming, currentStreamContent])

  // Ensure messages are up-to-date when activeSessionId changes
  useEffect(() => {
    if (activeSessionId) {
      refetchMessages()
    }
  }, [activeSessionId, refetchMessages])

  const handleSendMessage = () => {
    if (!message.trim() || isLoading) return

    const trimmedMessage = message.trim()
    setMessage("")

    console.log("Sending streaming message:", trimmedMessage)

    sendStreamingMessage({
      message: trimmedMessage,
      selectedDocuments,
      sessionId: activeSessionId,
      options: {
        includeCitations: true,
        tonePreference: "professional",
      },
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCancelStream = () => {
    cancelStream()
    toast({
      title: "Stream cancelled",
      description: "The AI response was cancelled.",
    })
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
        <div className="space-y-1 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center p-8">
              <FileText className="size-10 text-primary/60 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {selectedDocuments.length === 0
                  ? "AI Chat"
                  : "Document Assistant"}
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {selectedDocuments.length === 0
                  ? "Ask anything. Select documents from the right panel to chat with your content."
                  : `Ready to analyze ${selectedDocuments.length} document${
                      selectedDocuments.length > 1 ? "s" : ""
                    }. Ask questions about your documents to get AI-powered insights.`}
              </p>
            </div>
          )}

          {/* Display chat messages */}
          {messages.map((msg) =>
            msg.role === "user" ? (
              <ChatMessage key={msg.id} isUser={true}>
                <p>{msg.content}</p>
              </ChatMessage>
            ) : (
              <ChatMessage
                key={msg.id}
                isUser={false}
                content={msg.content}
                sources={msg.sources as unknown as Source[]}
              />
            )
          )}

          {/* Show streaming indicator with response when started */}
          {isStreaming && !hasStartedStreaming && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2">
                <Icons.spinner className="size-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  AI is thinking...
                </span>
              </div>
            </div>
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
                  ? "Ask anything..."
                  : "Ask questions about your documents..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />

            {/* Input Actions */}
            <div className="flex items-center justify-between gap-2 p-2 pt-0">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 rounded-full text-muted-foreground"
                  title="Attach document"
                >
                  <Paperclip className="size-4" />
                  <span className="sr-only">Attach</span>
                </Button>
              </div>
              <Button
                variant={isStreaming ? "destructive" : "default"}
                size="sm"
                className={cn("h-8 px-3", !message.trim() && "opacity-80")}
                onClick={isStreaming ? handleCancelStream : handleSendMessage}
              >
                {isStreaming ? (
                  <>
                    <Square className="size-3" />
                    Cancel
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
