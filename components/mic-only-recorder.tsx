"use client"

import { useCallback, useEffect } from "react"
import { Mic, MicOff } from "lucide-react"

import { useDeepgramConnection } from "@/hooks/use-deepgram-connection"
import { useMicrophoneOnly } from "@/hooks/use-microphone-only"
import { useQueue } from "@/hooks/use-queue"

import { Button } from "./ui/button"

export default function MicOnlyRecorder() {
  const { add, remove, first, size } = useQueue([])
  const { isListening, connection } = useDeepgramConnection("candidate")

  const handleDataAvailable = useCallback(
    (e: BlobEvent) => {
      add(e.data)
    },
    [add]
  )

  const { micOpen, toggleMicrophone } = useMicrophoneOnly(handleDataAvailable)

  useEffect(() => {
    if (size > 0 && isListening && connection) {
      connection.send(first)
      remove()
    }
  }, [connection, first, size, isListening, remove])

  return (
    <Button
      variant={micOpen ? "default" : "ghost"}
      size="icon"
      onClick={toggleMicrophone}
      title={micOpen ? "Stop my microphone" : "Start my microphone"}
    >
      {micOpen ? <Mic className="size-4" /> : <MicOff className="size-4" />}
    </Button>
  )
}
