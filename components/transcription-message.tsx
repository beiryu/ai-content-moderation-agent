type TranscriptionMessageType = "buffer" | "interim" | "final"

interface TranscriptionMessageProps {
  timestamp: string
  text: string
  type: TranscriptionMessageType
}

export function TranscriptionMessage({
  timestamp,
  text,
  type,
}: TranscriptionMessageProps) {
  return (
    <div className="flex items-start gap-3 py-2 animate-fade-in">
      <div className="min-w-12 text-xs text-muted-foreground">{timestamp}</div>
      <div
        className={`rounded-lg px-4 py-2 text-sm ${
          type === "interim"
            ? "bg-muted/50 text-muted-foreground italic"
            : type === "buffer"
            ? "bg-muted/80"
            : "bg-muted"
        }`}
      >
        {text}
      </div>
    </div>
  )
}
