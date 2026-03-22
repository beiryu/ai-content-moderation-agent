import { useCallback, useEffect } from "react"

import { useDeepgramConnection } from "@/hooks/use-deepgram-connection"
import { useMicrophone } from "@/hooks/use-microphone"
import { useQueue } from "@/hooks/use-queue"

import { RecordButton } from "./record-button"
import { Button } from "./ui/button"
import { VideoPreview } from "./video-preview"

export default function RecorderTranscriber() {
  const { add, remove, first, size } = useQueue([])
  const { isListening, connection, status, error } = useDeepgramConnection()

  const handleDataAvailable = useCallback(
    (e: BlobEvent) => {
      add(e.data)
    },
    [add]
  )

  const { micOpen, userMedia, toggleMicrophone } =
    useMicrophone(handleDataAvailable)

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
    <div className="relative w-full">
      {micOpen ? (
        <div className="flex max-h-[min(42vh,320px)] items-center justify-center overflow-hidden p-2">
          <VideoPreview stream={userMedia} />
        </div>
      ) : (
        <div className="flex flex-col items-center px-4 py-6">
          <p className="text-center text-sm font-medium text-muted-foreground">
            Connect to your interview meeting room
          </p>
          <RecordButton
            micOpen={micOpen}
            onClick={toggleMicrophone}
            disabled={status !== "ready"}
          />
        </div>
      )}
    </div>
  )
}
