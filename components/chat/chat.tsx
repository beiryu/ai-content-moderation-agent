"use client"

import { useEffect, useRef, useState } from "react"
import { useDocumentSelectionStore } from "@/stores/document-selection.store"
import { FileText, Paperclip, Send, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useGetDocuments } from "@/hooks/api/document/useGetDocuments"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { ChatMessage } from "@/components/chat/chat-message"

export default function Chat() {
  const { selectedDocuments, deselectDocument } = useDocumentSelectionStore()

  const { documents } = useGetDocuments()
  const selectedDocumentDetails =
    documents?.filter((doc) => selectedDocuments.includes(doc.id)) || []

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const handleSendMessage = () => {
    if (!message.trim() || selectedDocuments.length === 0) return

    // Implement your send message logic here
    console.log("Sending message:", message)
    setMessage("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h3 className="font-medium">Document Chat</h3>
        </div>
        <div className="flex items-center">
          <div className="inline-flex items-center bg-muted rounded-full border text-xs py-1 px-3 text-muted-foreground">
            <span className="mr-1">{selectedDocuments.length}</span>
            document{selectedDocuments.length !== 1 ? "s" : ""} selected
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="max-w-3xl space-y-6">
          <ChatMessage>
            <p>
              Hello! I can help you analyze and answer questions about your
              uploaded documents.
              {selectedDocuments.length === 0
                ? " Please select documents to get started."
                : ` I'm currently working with ${
                    selectedDocuments.length
                  } document${selectedDocuments.length > 1 ? "s" : ""}.`}
            </p>
            <p className="mt-2">You can ask me to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Summarize key points from your documents</li>
              <li>Find specific information or topics</li>
              <li>Compare content across multiple documents</li>
              <li>Extract important insights</li>
            </ul>
          </ChatMessage>

          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="border-t p-4">
        <div className="mx-auto">
          <div className="relative rounded-lg border bg-background transition-colors focus-within:ring-1 focus-within:ring-ring">
            {/* Selected Documents Context */}
            {selectedDocuments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pt-3 pb-1">
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

            <Textarea
              className={cn(
                "w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                selectedDocuments.length > 0
                  ? "min-h-[60px] p-3 pt-1"
                  : "min-h-[80px] p-3"
              )}
              placeholder={
                selectedDocuments.length === 0
                  ? "Select documents, then ask questions..."
                  : "Ask questions about your documents..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={selectedDocuments.length === 0}
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
                disabled={!message.trim() || selectedDocuments.length === 0}
                onClick={handleSendMessage}
              >
                <Send className="size-4 mr-1.5" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
