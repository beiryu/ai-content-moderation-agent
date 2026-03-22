import { useEffect, useRef } from "react"
import { useInterviewSessionStore } from "@/stores/interview-session.store"

import RecorderTranscriber from "./recorder-transcriber"
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
  const { messages, interviewerBuffer, candidateBuffer, interimText } =
    useInterviewSessionStore()

  const scrollRef = useRef<HTMLDivElement>(null)

  useScrollToTop(scrollRef, [
    messages.length,
    interimText,
    interviewerBuffer,
    candidateBuffer,
  ])

  return (
    <div className="flex h-[calc(100vh-theme(spacing.40))] flex-col">
      <div className="sticky bottom-0">
        <RecorderTranscriber />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
        <div className="flex flex-col gap-2 p-4">
          {/* Most recent live text at top, then finalized messages newest → oldest */}
          {interimText && (
            <TranscriptionMessage
              timestamp={new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              text={interimText}
              type="interim"
              role="interviewer"
            />
          )}

          {candidateBuffer && (
            <TranscriptionMessage
              timestamp={new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              text={candidateBuffer}
              type="buffer"
              role="candidate"
            />
          )}

          {interviewerBuffer && (
            <TranscriptionMessage
              timestamp={new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              text={interviewerBuffer}
              type="buffer"
              role="interviewer"
            />
          )}

          {[...messages].reverse().map((message) => (
            <TranscriptionMessage
              key={message.id}
              timestamp={message.createdAt.toLocaleTimeString([], {
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
