import { Button } from "@/components/ui/button"

import { Icons } from "./icons"

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
    <Button onClick={onClick} disabled={disabled} className="w-full">
      <div className="flex items-center">
        {micOpen ? (
          <>
            <Icons.micOff className="h-4 w-4 -translate-x-0.5 mr-2" />
            Stop listening
          </>
        ) : (
          <>
            <Icons.micOn className="h-4 w-4 -translate-x-0.5 mr-2" />
            Start listening
          </>
        )}
      </div>
    </Button>
  )
}
