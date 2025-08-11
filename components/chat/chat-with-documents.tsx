"use client"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import Chat from "@/components/chat/chat"
import DocumentSelector from "@/components/chat/document-selector"

export default function ChatWithDocuments() {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
      {/* Chat Panel */}
      <ResizablePanel defaultSize={70} minSize={50}>
        <div className="flex flex-col h-full">
          {/* Chat Component */}
          <div className="flex-1">
            <Chat />
          </div>
        </div>
      </ResizablePanel>

      {/* Resizable Handle */}
      <ResizableHandle withHandle />

      {/* Document Selector Panel */}
      <ResizablePanel defaultSize={30} minSize={30}>
        <DocumentSelector />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
