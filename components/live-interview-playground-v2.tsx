"use client"

import * as React from "react"
import { INTERVIEW_RESPONSES_MOCKS } from "@/mocks/data"
import { Clock, Mic, Send, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { TooltipProvider } from "@/components/ui/tooltip"
import { LiveInterviewResponses } from "@/components/live-interview-responses"
import { MicrophoneConnectionStatus } from "@/components/microphone-connection-status"
import { TranscriptionDisplay } from "@/components/transcription-display"

interface LiveInterviewPlaygroundV2Props {
  defaultLayout: number[] | undefined
}

export function LiveInterviewPlaygroundV2({
  defaultLayout = [30, 40, 30],
}: LiveInterviewPlaygroundV2Props) {
  const [timer, setTimer] = React.useState("00:00")
  const [message, setMessage] = React.useState("")

  React.useEffect(() => {
    // Timer implementation
    let seconds = 0
    const interval = setInterval(() => {
      seconds++
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      setTimer(
        `${minutes.toString().padStart(2, "0")}:${remainingSeconds
          .toString()
          .padStart(2, "0")}`
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:layout:mail=${JSON.stringify(
            sizes
          )}`
        }}
        className="max-h-[calc(100vh-100px)] items-stretch rounded-lg border"
      >
        <ResizablePanel defaultSize={defaultLayout[0]} minSize={25}>
          <div className="flex h-[52px] items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">Interviewer says:</div>
              <MicrophoneConnectionStatus />
            </div>
          </div>
          <Separator />
          <TranscriptionDisplay />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          <div className="flex h-[52px] items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Live Interview</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" />
                {timer}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Settings className="size-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Mic className="size-4" />
              </Button>
              <Switch />
              <Button variant="destructive" size="sm">
                Leave
              </Button>
            </div>
          </div>
          <Separator />
          <div className="bg-background/95 p-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">AI Responses:</div>
              <div className="flex size-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Ready</span>
            </div>
          </div>
          <LiveInterviewResponses items={INTERVIEW_RESPONSES_MOCKS} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[2]} minSize={25}>
          <div className="flex h-[52px] items-center px-4">
            <h2 className="text-lg font-semibold">Chat with AI Assistant</h2>
          </div>
          <Separator />
          <div className="flex h-full flex-col justify-between">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Chat messages will go here */}
                <div className="flex flex-col space-y-2">
                  <div className="bg-muted w-max max-w-[75%] rounded-lg px-4 py-2 text-sm">
                    Hello! I&apos;m your AI interview assistant. How can I help
                    you today?
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-background">
              <Separator />
              <div className="shrink-0 border-t p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    setMessage("")
                  }}
                  className="relative flex items-center"
                >
                  <Textarea
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 resize-none overflow-hidden pr-12"
                    style={{ maxHeight: "120px" }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute right-2"
                  >
                    <Send className="size-4" />
                    <span className="sr-only">Send message</span>
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  )
}
