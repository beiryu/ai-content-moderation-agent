import { useCallback, useEffect, useRef, useState } from "react"
import { useInterviewSessionStore } from "@/stores/interview-session.store"
import {
  LiveClient,
  LiveTranscriptionEvents,
  createClient,
} from "@deepgram/sdk"

type DeepgramConnectionStatus = "idle" | "loading" | "ready" | "error"

interface UseDeepgramConnectionReturn {
  isListening: boolean
  connection: LiveClient | null
  status: DeepgramConnectionStatus
  error: Error | null
}

export function useDeepgramConnection(): UseDeepgramConnectionReturn {
  const { processTranscript } = useInterviewSessionStore()

  const [status, setStatus] = useState<DeepgramConnectionStatus>("idle")
  const [error, setError] = useState<Error | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [connection, setConnection] = useState<LiveClient | null>(null)

  const keepAliveInterval = useRef<NodeJS.Timeout>()

  const initializeConnection = useCallback(async () => {
    try {
      setStatus("loading")
      const response = await fetch("/api/deepgram", { cache: "no-store" })
      const data = await response.json()

      if (!("key" in data)) {
        throw new Error("No API key returned")
      }

      const deepgram = createClient(data.key)
      const conn = deepgram.listen.live({
        model: "nova-2",
        interim_results: true,
        smart_format: true,
      })

      // Setup keepAlive interval
      keepAliveInterval.current = setInterval(() => {
        if (conn && conn.getReadyState() === 1) {
          // 1 = OPEN
          conn.keepAlive()
          console.log("Sent keepAlive message")
        }
      }, 10000) // Send keepAlive every 10 seconds

      conn.on(LiveTranscriptionEvents.Open, () => {
        setIsListening(true)
        setStatus("ready")
      })

      conn.on(LiveTranscriptionEvents.Close, () => {
        setIsListening(false)
        setConnection(null)
      })

      conn.on(LiveTranscriptionEvents.Transcript, (data) => {
        const words = data.channel.alternatives[0].words
        if (words.length === 0) return

        const currentTranscript = words
          .map((word: any) => word.punctuated_word ?? word.word)
          .join(" ")

        processTranscript(currentTranscript, data.is_final)
      })

      setConnection(conn)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      setStatus("error")
    }
  }, [processTranscript])

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
    }
  }, [])

  return {
    isListening,
    connection,
    status,
    error,
  }
}
