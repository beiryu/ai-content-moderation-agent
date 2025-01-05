import { useLiveInterviewStore } from "@/stores/live-interview.store"
import { Cable } from "lucide-react"

import { HoverBorderGradient } from "./ui/hover-border-gradient"

export function TranscriptionDisplay() {
  const { transcribedText, interimText } = useLiveInterviewStore()

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col">
        <div className="flex-1 p-4">
          <div className="mb-4 flex flex-col items-center">
            <div className="text-sm font-medium text-muted-foreground">
              Connect to your interview meeting room
            </div>
            <div className="m-4 flex justify-center text-center">
              <HoverBorderGradient
                containerClassName="rounded-full"
                as="button"
                className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-2"
              >
                <Cable />
                <span>Select</span>
              </HoverBorderGradient>
            </div>
          </div>
          <div className="whitespace-pre-wrap text-sm">
            {transcribedText}
            <span className="text-muted-foreground">{interimText}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
