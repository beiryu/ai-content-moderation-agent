"use client"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import LangChainChat from "@/components/chat/langchain-chat"
import ChatSessions from "@/components/chat/chat-sessions"
import DocumentSelector from "@/components/chat/document-selector"

export default function LangChainChatWithDocuments() {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
      {/* Sessions Panel */}
      <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
        <ChatSessions />
      </ResizablePanel>

      {/* Resizable Handle */}
      <ResizableHandle withHandle />

      {/* Chat Panel */}
      <ResizablePanel defaultSize={45} minSize={40}>
        <div className="flex flex-col h-full">
          {/* LangChain Chat Component */}
          <div className="flex-1">
            <LangChainChat />
          </div>
        </div>
      </ResizablePanel>

      {/* Resizable Handle */}
      <ResizableHandle withHandle />

      {/* Document Selector Panel */}
      <ResizablePanel defaultSize={30} minSize={20}>
        <DocumentSelector />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}