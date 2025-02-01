import { useEffect, useRef } from "react"
import { useLiveInterviewStore } from "@/stores/live-interview.store"

import RecorderTranscriber from "./recorder-transcriber"
import { TranscriptionMessage } from "./transcription-message"

const useScrollToBottom = (ref: React.RefObject<HTMLElement>, deps: any[]) => {
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export function TranscriptionDisplay() {
  const { messages, transcriptionBuffer, interimText } = useLiveInterviewStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useScrollToBottom(scrollRef, [interimText])

  return (
    <div className="flex h-[calc(100vh-theme(spacing.40))] flex-col">
      <div className="sticky bottom-0">
        <RecorderTranscriber />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
        <div className="p-4 space-y-2">
          {/* Completed messages */}
          {messages.map((message) => (
            <TranscriptionMessage
              key={message.id}
              timestamp={message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              text={message.text}
              type="final"
            />
          ))}

          {/* Current buffer */}
          {transcriptionBuffer && (
            <TranscriptionMessage
              timestamp={new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              text={transcriptionBuffer}
              type="buffer"
            />
          )}

          {/* Interim text */}
          {interimText && (
            <TranscriptionMessage
              timestamp={new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              text={interimText}
              type="interim"
            />
          )}
        </div>
      </div>
    </div>
  )
}
