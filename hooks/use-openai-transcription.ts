"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useInterviewSessionStore } from "@/stores/interview-session.store"

import { toast } from "@/components/ui/use-toast"

type TranscriptionStatus = "idle" | "loading" | "ready" | "error"

interface UseOpenAITranscriptionReturn {
  isListening: boolean
  startListening: () => Promise<void>
  stopListening: () => void
  status: TranscriptionStatus
  error: Error | null
  stream: MediaStream | null
}

export function useOpenAITranscription(
  role: "interviewer" | "candidate" = "interviewer"
): UseOpenAITranscriptionReturn {
  const { processTranscript, flushTranscript, setMicrophoneStatus } =
    useInterviewSessionStore()

  const [status, setStatus] = useState<TranscriptionStatus>("idle")
  const [error, setError] = useState<Error | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const isStoppingRef = useRef(false)
  const pendingFlushRef = useRef(false)
  const flushFallbackRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const interimBufferRef = useRef("")

  const cleanup = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null

    workletNodeRef.current?.disconnect()
    workletNodeRef.current = null

    sourceNodeRef.current?.disconnect()
    sourceNodeRef.current = null

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    audioContextRef.current?.close()
    audioContextRef.current = null

    clearTimeout(flushFallbackRef.current)
    pendingFlushRef.current = false

    setStream(null)
  }, [])

  const stopListening = useCallback(() => {
    isStoppingRef.current = true
    clearTimeout(reconnectTimeoutRef.current)
    cleanup()
    setIsListening(false)
    setStatus("idle")
    setMicrophoneStatus("disconnected")
    // Reset for next startListening
    reconnectAttemptsRef.current = 0
    isStoppingRef.current = false
  }, [cleanup, setMicrophoneStatus])

  const startAudioPipeline = useCallback(
    async (ws: WebSocket) => {
      const ctx = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = ctx

      await ctx.audioWorklet.addModule("/pcm-processor.js")

      const mediaStream =
        role === "interviewer"
          ? await navigator.mediaDevices.getDisplayMedia({
              audio: true,
              video: true,
            })
          : await navigator.mediaDevices.getUserMedia({ audio: true })

      streamRef.current = mediaStream
      setStream(mediaStream)

      const source = ctx.createMediaStreamSource(mediaStream)
      sourceNodeRef.current = source

      const workletNode = new AudioWorkletNode(ctx, "pcm-processor")
      workletNodeRef.current = workletNode

      workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState !== WebSocket.OPEN) return
        const bytes = new Uint8Array(e.data)
        let binary = ""
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        ws.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: btoa(binary),
          })
        )
      }

      source.connect(workletNode)
      setMicrophoneStatus("connected")
    },
    [role, setMicrophoneStatus]
  )

  const connect = useCallback(async () => {
    try {
      setStatus("loading")
      setMicrophoneStatus("connecting")

      const res = await fetch("/api/transcription-session", {
        cache: "no-store",
      })
      if (!res.ok) throw new Error("Failed to get transcription session token")
      const { client_secret: token } = await res.json()

      const ws = new WebSocket(
        "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
        [
          "realtime",
          `openai-insecure-api-key.${token}`,
          "openai-beta.realtime-v1",
        ]
      )
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              input_audio_format: "pcm16",
              input_audio_transcription: {
                model: "gpt-4o-transcribe",
              },
              turn_detection: {
                type: "server_vad",
                silence_duration_ms: 1200,
                threshold: 0.5,
              },
            },
          })
        )
      }

      ws.onmessage = async (event) => {
        let data: { type: string; [key: string]: unknown }
        try {
          data = JSON.parse(event.data)
        } catch {
          return
        }

        if (data.type === "session.created") {
          try {
            await startAudioPipeline(ws)
            setStatus("ready")
            setIsListening(true)
            reconnectAttemptsRef.current = 0
          } catch (err) {
            console.error("Failed to start audio pipeline:", err)
            setError(
              err instanceof Error ? err : new Error("Audio pipeline failed")
            )
            setStatus("error")
            setMicrophoneStatus("disconnected")
          }
        } else if (
          data.type === "conversation.item.input_audio_transcription.delta"
        ) {
          const delta = (data as { delta?: string }).delta ?? ""
          if (delta) processTranscript(delta, false, role)
        } else if (
          data.type === "conversation.item.input_audio_transcription.completed"
        ) {
          const transcript = (data as { transcript?: string }).transcript ?? ""
          if (transcript) processTranscript(transcript, true, role)
          // Flush after completed, not after speech_stopped (completed fires after)
          if (pendingFlushRef.current) {
            pendingFlushRef.current = false
            clearTimeout(flushFallbackRef.current)
            flushTranscript(role).catch(console.error)
          }
        } else if (data.type === "input_audio_buffer.speech_stopped") {
          // Don't flush here — transcript.completed hasn't fired yet
          pendingFlushRef.current = true
          // Fallback: if completed never arrives (e.g. silent buffer), flush after 3s
          flushFallbackRef.current = setTimeout(() => {
            if (pendingFlushRef.current) {
              pendingFlushRef.current = false
              flushTranscript(role).catch(console.error)
            }
          }, 3000)
        } else if (data.type === "error") {
          console.error("OpenAI Realtime error:", data)
        }
      }

      ws.onerror = (e) => {
        console.error("WebSocket error:", e)
      }

      ws.onclose = () => {
        if (isStoppingRef.current) return
        setIsListening(false)

        if (reconnectAttemptsRef.current < 3) {
          const delay = 1000 * Math.pow(2, reconnectAttemptsRef.current)
          reconnectAttemptsRef.current += 1
          reconnectTimeoutRef.current = setTimeout(() => {
            cleanup()
            connect()
          }, delay)
        } else {
          setStatus("error")
          setMicrophoneStatus("disconnected")
          toast({
            title: "Connection lost",
            description: "Please restart the microphone.",
            variant: "destructive",
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      setStatus("error")
      setMicrophoneStatus("disconnected")
    }
  }, [
    startAudioPipeline,
    processTranscript,
    flushTranscript,
    role,
    cleanup,
    setMicrophoneStatus,
  ])

  const startListening = useCallback(async () => {
    reconnectAttemptsRef.current = 0
    await connect()
  }, [connect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isStoppingRef.current = true
      clearTimeout(reconnectTimeoutRef.current)
      cleanup()
    }
  }, [cleanup])

  return {
    isListening,
    startListening,
    stopListening,
    status,
    error,
    stream,
  }
}
