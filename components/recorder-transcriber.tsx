"use client"

import { useCallback, useEffect } from "react"

import { useDeepgramConnection } from "@/hooks/use-deepgram-connection"
import { useMicrophone } from "@/hooks/use-microphone"
import { useQueue } from "@/hooks/use-queue"

import { RecordButton } from "./record-button"
import { VideoPreview } from "./video-preview"

export default function RecorderTranscriber() {
  const { add, remove, first, size } = useQueue([])
  const { connection, status } = useDeepgramConnection("interviewer")

  const handleDataAvailable = useCallback(
    (e: BlobEvent) => {
      if (e.data.size > 0) add(e.data)
    },
    [add]
  )

  const { micOpen, userMedia, toggleMicrophone } =
    useMicrophone(handleDataAvailable)

  useEffect(() => {
    if (!connection || size === 0) return
    connection.send(first)
    remove()
  }, [connection, size, first, remove])

  return (
    <div className="relative w-full">
      {micOpen && userMedia ? (
        <div className="flex max-h-[min(42vh,320px)] items-center justify-center overflow-hidden p-2">
          <VideoPreview stream={userMedia} />
        </div>
      ) : (
        <div className="flex flex-col items-center">
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
