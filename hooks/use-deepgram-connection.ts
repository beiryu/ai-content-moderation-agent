import { useCallback, useEffect, useRef, useState } from "react"
import { useInterviewSessionStore } from "@/stores/interview-session.store"
import {
  LiveClient,
  LiveTranscriptionEvents,
  createClient,
} from "@deepgram/sdk"

import { useConfig } from "@/lib/config/config.hooks"

type DeepgramConnectionStatus = "idle" | "loading" | "ready" | "error"

interface UseDeepgramConnectionReturn {
  isListening: boolean
  connection: LiveClient | null
  status: DeepgramConnectionStatus
  error: Error | null
}

export function useDeepgramConnection(
  role: "interviewer" | "candidate" = "interviewer"
): UseDeepgramConnectionReturn {
  const { config } = useConfig()
  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  }, [config])

  const [status, setStatus] = useState<DeepgramConnectionStatus>("idle")
  const [error, setError] = useState<Error | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [connection, setConnection] = useState<LiveClient | null>(null)

  const keepAliveInterval = useRef<NodeJS.Timeout>()
  const silenceInterval = useRef<NodeJS.Timeout>()

  const initializeConnection = useCallback(async () => {
    const cfg = configRef.current
    try {
      setStatus("loading")
      const response = await fetch("/api/deepgram", { cache: "no-store" })
      const data = await response.json()

      if (!("key" in data)) {
        throw new Error("No API key returned")
      }

      const deepgram = createClient(data.key)
      const conn = deepgram.listen.live({
        model: cfg.deepgram.model,
        language: cfg.deepgram.language,
        interim_results: cfg.deepgram.interimResults,
        smart_format: cfg.deepgram.smartFormat,
        utterance_end_ms: cfg.deepgram.utteranceEndMs,
        endpointing: cfg.deepgram.endpointing,
      })

      keepAliveInterval.current = setInterval(() => {
        if (conn && conn.getReadyState() === 1) {
          // 1 = OPEN
          conn.keepAlive()
          console.log("Sent keepAlive message")
        }
      }, cfg.deepgram.keepAliveIntervalMs)

      silenceInterval.current = setInterval(() => {
        const state = useInterviewSessionStore.getState()
        const silentFor = Date.now() - state.lastSpeakTime
        if (silentFor > cfg.interview.silenceThresholdMs) {
          const bufferKey =
            role === "interviewer" ? "interviewerBuffer" : "candidateBuffer"
          if (state[bufferKey].trim()) {
            state.flushTranscript(role)
          }
        }
      }, cfg.interview.silenceCheckIntervalMs)

      conn.on(LiveTranscriptionEvents.Open, () => {
        setIsListening(true)
        setStatus("ready")
      })

      conn.on(LiveTranscriptionEvents.Close, () => {
        setIsListening(false)
        setConnection(null)
      })

      conn.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        void useInterviewSessionStore.getState().flushTranscript(role)
      })

      conn.on(LiveTranscriptionEvents.Transcript, (data) => {
        const alt = data.channel.alternatives[0]
        const words = alt.words ?? []
        const fromWords =
          words.length > 0
            ? words
                .map(
                  (w: { punctuated_word?: string; word?: string }) =>
                    w.punctuated_word ?? w.word
                )
                .join(" ")
            : ""
        const currentTranscript = (fromWords || alt.transcript || "").trim()
        if (!currentTranscript) return

        useInterviewSessionStore
          .getState()
          .processTranscript(currentTranscript, data.is_final, role)
      })

      setConnection(conn)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      setStatus("error")
    }
  }, [role])

  useEffect(() => {
    initializeConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current)
      }
      if (silenceInterval.current) {
        clearInterval(silenceInterval.current)
      }
    }
  }, [])

  return {
    isListening,
    connection,
    status,
    error,
  }
}
