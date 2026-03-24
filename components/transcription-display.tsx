import { useEffect, useRef } from "react"
import { useInterviewSessionStore } from "@/stores/interview-session.store"

import { TranscriptionMessage } from "./transcription-message"

const useScrollToTop = (ref: React.RefObject<HTMLElement>, deps: unknown[]) => {
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export function TranscriptionDisplay() {
  const { messages, interviewerBuffer, candidateBuffer, interimRole } =
    useInterviewSessionStore()

  const scrollRef = useRef<HTMLDivElement>(null)

  const showInterviewerSpeaking =
    interimRole === "interviewer" || !!interviewerBuffer
  const showCandidateSpeaking = interimRole === "candidate" || !!candidateBuffer

  useScrollToTop(scrollRef, [
    messages.length,
    showInterviewerSpeaking,
    showCandidateSpeaking,
  ])

  const now = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="flex flex-col gap-2 p-4">
          {showInterviewerSpeaking && (
            <TranscriptionMessage
              timestamp={now}
              type="speaking"
              role="interviewer"
            />
          )}

          {showCandidateSpeaking && (
            <TranscriptionMessage
              timestamp={now}
              type="speaking"
              role="candidate"
            />
          )}

          {[...messages].reverse().map((message) => (
            <TranscriptionMessage
              key={message.id}
              timestamp={new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              text={message.content}
              type="final"
              role={message.role as "interviewer" | "candidate"}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
