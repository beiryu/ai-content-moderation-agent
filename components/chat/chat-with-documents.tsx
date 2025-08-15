"use client"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import Chat from "@/components/chat/chat"
import ChatSessions from "@/components/chat/chat-sessions"
import DocumentSelector from "@/components/chat/document-selector"

export function ChatWithDocuments() {
  return (
    <div className="h-full bg-background">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Sessions Panel */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
          <ChatSessions />
        </ResizablePanel>

        {/* Resizable Handle */}
        <ResizableHandle />

        {/* Chat Panel */}
        <ResizablePanel defaultSize={45} minSize={30}>
          <div className="h-full bg-background flex flex-col">
            <Chat />
          </div>
        </ResizablePanel>

        {/* Resizable Handle */}
        <ResizableHandle />

        {/* Document Selector Panel */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <DocumentSelector />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
