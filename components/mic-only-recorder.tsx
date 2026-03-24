"use client"

import { useCallback, useEffect } from "react"
import { Mic, MicOff } from "lucide-react"

import { useDeepgramConnection } from "@/hooks/use-deepgram-connection"
import { useMicrophoneOnly } from "@/hooks/use-microphone-only"
import { useQueue } from "@/hooks/use-queue"

import { Button } from "./ui/button"

export default function MicOnlyRecorder() {
  const { add, remove, first, size } = useQueue([])
  const { connection } = useDeepgramConnection("candidate")

  const handleDataAvailable = useCallback(
    (e: BlobEvent) => {
      if (e.data.size > 0) add(e.data)
    },
    [add]
  )

  const { micOpen, toggleMicrophone } = useMicrophoneOnly(handleDataAvailable)

  useEffect(() => {
    if (!connection || size === 0) return
    connection.send(first)
    remove()
  }, [connection, size, first, remove])

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
