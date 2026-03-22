"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useInterviewSessionStore } from "@/stores/interview-session.store"
import { Clock, Settings } from "lucide-react"

import useCreateInterviewSession from "@/hooks/api/interview-session/useCreateInterviewSession"
import useUpdateInterviewSession from "@/hooks/api/interview-session/useUpdateInterviewSession"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { TooltipProvider } from "@/components/ui/tooltip"
import StreamingChat from "@/components/chat/streaming-chat"
import { LiveInterviewResponses } from "@/components/live-interview-responses"
import MicOnlyRecorder from "@/components/mic-only-recorder"
import { MicrophoneConnectionStatus } from "@/components/microphone-connection-status"
import { TranscriptionDisplay } from "@/components/transcription-display"

interface LiveInterviewPlaygroundV2Props {
  interviewId: string
  defaultLayout: number[] | undefined
}

export function LiveInterviewPlaygroundV2({
  interviewId,
  defaultLayout = [30, 40, 30],
}: LiveInterviewPlaygroundV2Props) {
  const { setCurrentSessionId } = useInterviewSessionStore()

  const { mutateAsync: createSession } = useCreateInterviewSession()
  const { mutateAsync: updateSession } = useUpdateInterviewSession()

  const [timer, setTimer] = useState("00:00")
  const timerRef = useRef<NodeJS.Timeout>()
  const cleanupRef = useRef<(() => void) | null>(null)

  // Reset and start timer
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    setTimer("00:00")
    let seconds = 0
    timerRef.current = setInterval(() => {
      seconds++
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      setTimer(
        `${minutes.toString().padStart(2, "0")}:${remainingSeconds
          .toString()
          .padStart(2, "0")}`
      )
    }, 1000)
  }, [])

  // Start new session when component mounts
  useEffect(() => {
    let mounted = true

    const initSession = async () => {
      try {
        createSession(
          { interviewId },
          {
            onSuccess: (result) => {
              if (mounted) {
                setCurrentSessionId(result.id)
              }
            },
          }
        )
      } catch (error) {
        console.error("Failed to create session:", error)
      }
    }

    initSession()
    resetTimer()

    return () => {
      mounted = false
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // Store cleanup function to avoid running during unmount
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId])

  // Setup cleanup effect separately
  useEffect(() => {
    cleanupRef.current = async () => {
      try {
        updateSession(
          {
            id: interviewId,
            status: "completed",
          },
          {
            onSettled: () => {
              setCurrentSessionId(null)
            },
          }
        )
      } catch (error) {
        console.error("Failed to cleanup session:", error)
      }
    }
  }, [interviewId, updateSession, setCurrentSessionId])

  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        direction="horizontal"
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
              <MicOnlyRecorder />
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
          <LiveInterviewResponses />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[2]} minSize={25}>
          <div className="flex h-full flex-col overflow-hidden">
            <StreamingChat />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  )
}
