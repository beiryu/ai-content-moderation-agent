import { useOpenAITranscription } from "@/hooks/use-openai-transcription"

import { RecordButton } from "./record-button"
import { Button } from "./ui/button"
import { VideoPreview } from "./video-preview"

export default function RecorderTranscriber() {
  const { isListening, startListening, stopListening, status, error, stream } =
    useOpenAITranscription("interviewer")

  if (status === "error") {
    return (
      <Button variant="destructive" className="cursor-not-allowed">
        Error: {error?.message}
      </Button>
    )
  }

  return (
    <div className="relative w-full">
      {isListening && stream ? (
        <div className="flex max-h-[min(42vh,320px)] items-center justify-center overflow-hidden p-2">
          <VideoPreview stream={stream} />
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <RecordButton
            micOpen={isListening}
            onClick={isListening ? stopListening : startListening}
            disabled={status === "loading"}
          />
        </div>
      )}
    </div>
  )
}
