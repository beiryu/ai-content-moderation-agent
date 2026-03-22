"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useChatDocumentStore } from "@/stores/chat-document-store"
import { useInterviewSessionStore } from "@/stores/interview-session.store"
import { Clock } from "lucide-react"

import useCreateInterviewSession from "@/hooks/api/interview-session/useCreateInterviewSession"
import useUpdateInterviewSession from "@/hooks/api/interview-session/useUpdateInterviewSession"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import StreamingChat from "@/components/chat/streaming-chat"
import { LiveInterviewResponses } from "@/components/live-interview-responses"
import MicOnlyRecorder from "@/components/mic-only-recorder"
import { MicrophoneConnectionStatus } from "@/components/microphone-connection-status"
import RecorderTranscriber from "@/components/recorder-transcriber"
import { TranscriptionDisplay } from "@/components/transcription-display"

interface LiveInterviewPlaygroundV2Props {
  interviewId: string
  defaultLayout: number[] | undefined
}

export function LiveInterviewPlaygroundV2({
  interviewId,
  defaultLayout = [30, 40, 30],
}: LiveInterviewPlaygroundV2Props) {
  const router = useRouter()
  const { setCurrentSessionId, setSessionContext } = useInterviewSessionStore()
  const { clearDocumentSelection, clearActiveSession } = useChatDocumentStore()

  const { mutateAsync: createSession } = useCreateInterviewSession()
  const { mutateAsync: updateSession } = useUpdateInterviewSession()

  const [timer, setTimer] = useState("00:00")
  const timerRef = useRef<NodeJS.Timeout>()
  const cleanupRef = useRef<(() => void) | null>(null)
  /** DB id of the active InterviewSession (not the parent interview's id). */
  const interviewSessionIdRef = useRef<string | null>(null)

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

  // Reset RAG chat state when interview changes
  useEffect(() => {
    clearDocumentSelection()
    clearActiveSession()
  }, [interviewId, clearDocumentSelection, clearActiveSession])

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
                interviewSessionIdRef.current = result.id
                setCurrentSessionId(result.id)
                setSessionContext(result.sessionContext ?? "")
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

      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId])

  // Setup cleanup effect separately
  useEffect(() => {
    cleanupRef.current = async () => {
      const sessionId = interviewSessionIdRef.current
      interviewSessionIdRef.current = null
      setSessionContext("")
      if (!sessionId) {
        setCurrentSessionId(null)
        return
      }
      try {
        await updateSession(
          {
            id: sessionId,
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
  }, [updateSession, setCurrentSessionId, setSessionContext])

  const handleLeave = useCallback(() => {
    void cleanupRef.current?.()
    router.push("/dashboard/interviews")
  }, [router])

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col">
        {/* Unified top header */}
        <div className="flex h-14 shrink-0 items-center justify-between rounded-t-lg border border-b-0 bg-background px-5">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-tight">
              Live Interview
            </h1>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              <span className="font-mono tabular-nums">{timer}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MicOnlyRecorder />
            <Button variant="destructive" size="sm" onClick={handleLeave}>
              End Session
            </Button>
          </div>
        </div>

        <ResizablePanelGroup
          direction="horizontal"
          className="max-h-[calc(100vh-156px)] items-stretch rounded-b-lg border"
        >
          {/* Left panel: Transcription */}
          <ResizablePanel
            defaultSize={defaultLayout[0]}
            minSize={25}
            className="flex min-h-0 flex-col"
          >
            <div className="flex h-11 shrink-0 items-center gap-2 border-b px-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Transcription
              </span>
              <MicrophoneConnectionStatus />
            </div>
            <TranscriptionDisplay />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center panel: Connection status + AI Responses */}
          <ResizablePanel
            defaultSize={defaultLayout[1]}
            minSize={30}
            className="flex min-h-0 flex-col"
          >
            <ResizablePanelGroup direction="vertical">
              {/* Meeting room: connect flow + screen preview */}
              <ResizablePanel
                defaultSize={28}
                minSize={15}
                className="flex min-h-0 flex-col"
              >
                <div className="flex h-11 shrink-0 items-center gap-2 border-b px-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Meeting room
                  </span>
                  <MicrophoneConnectionStatus />
                </div>
                <div className="min-h-0 flex-1 overflow-auto border-b bg-muted/30 px-3 py-4">
                  <RecorderTranscriber />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* AI Suggestions */}
              <ResizablePanel
                defaultSize={72}
                minSize={20}
                className="flex min-h-0 flex-col"
              >
                <div className="flex h-10 shrink-0 items-center justify-between border-b px-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    AI Suggestions
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">Ready</span>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <LiveInterviewResponses />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right panel: Chat */}
          <ResizablePanel
            defaultSize={defaultLayout[2]}
            minSize={25}
            className="flex min-h-0 flex-col"
          >
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <StreamingChat />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </TooltipProvider>
  )
}
