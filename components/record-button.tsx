import { Cable } from "lucide-react"

import { Icons } from "./icons"
import { HoverBorderGradient } from "./ui/hover-border-gradient"

interface RecordButtonProps {
  micOpen: boolean
  onClick: () => void
  disabled?: boolean
}

export function RecordButton({
  micOpen,
  onClick,
  disabled,
}: RecordButtonProps) {
  return (
    <HoverBorderGradient
      onClick={onClick}
      containerClassName="rounded-full m-4"
      as="button"
      className="dark:bg-black bg-white text-black dark:text-white "
    >
      <div className="flex items-center">
        {micOpen ? (
          <>
            <Icons.micOff className="size-4 -translate-x-0.5 mr-2" />
            Stop listening
          </>
        ) : (
          <>
            {/* <Icons.micOn className="size-4 -translate-x-0.5 mr-2" />
              Start listening */}
            <Cable className="size-4 -translate-x-0.5 mr-2" />
            <span className="text-sm font-medium">Select a meeting room</span>
          </>
        )}
      </div>
    </HoverBorderGradient>
  )
}
