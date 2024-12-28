import { useCallback, useEffect } from "react"

import { useDeepgramConnection } from "@/hooks/use-deepgram-connection"
import { useMicrophone } from "@/hooks/use-microphone"
import { useQueue } from "@/hooks/use-queue"

import { RecordButton } from "./record-button"
import { Button } from "./ui/button"

export default function RecorderTranscriber() {
  const { add, remove, first, size } = useQueue([])

  const { isListening, connection, status, error } = useDeepgramConnection()

  const handleDataAvailable = useCallback(
    (e: BlobEvent) => {
      add(e.data)
    },
    [add]
  )

  const { micOpen, toggleMicrophone } = useMicrophone(handleDataAvailable)

  // Process queue
  useEffect(() => {
    if (size > 0 && isListening && connection) {
      connection.send(first)
      remove()
    }
  }, [connection, first, size, isListening, remove])

  if (status === "error") {
    return (
      <Button variant="destructive" className="cursor-not-allowed">
        Error: {error?.message}
      </Button>
    )
  }

  return (
    <div className="w-full relative">
      <div className="grid align-middle items-center gap-2">
        <RecordButton
          micOpen={micOpen}
          onClick={toggleMicrophone}
          disabled={status !== "ready"}
        />
      </div>
    </div>
  )
}
