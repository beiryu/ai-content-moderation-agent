type TranscriptionMessageType = "buffer" | "interim" | "final"

interface TranscriptionMessageProps {
  timestamp: string
  text: string
  type: TranscriptionMessageType
  role?: "interviewer" | "candidate"
}

export function TranscriptionMessage({
  timestamp,
  text,
  type,
  role,
}: TranscriptionMessageProps) {
  const isCandidate = role === "candidate"
  const isInterim = type === "interim"
  const isBuffer = type === "buffer"

  if (isInterim || isBuffer) {
    return (
      <div className="flex items-start gap-3 py-1 animate-fade-in">
        <div className="min-w-12 text-xs text-muted-foreground">{timestamp}</div>
        <div className="rounded-lg px-4 py-2 text-sm bg-muted/50 text-muted-foreground italic opacity-60">
          {text}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col gap-1 py-1 animate-fade-in ${
        isCandidate ? "items-end" : "items-start"
      }`}
    >
      <span className="text-xs text-muted-foreground px-1">
        {isCandidate ? "Me" : "Interviewer"}
      </span>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
          isCandidate
            ? "bg-primary/15 text-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        }`}
      >
        {text}
      </div>
      <span className="text-xs text-muted-foreground/60 px-1">{timestamp}</span>
    </div>
  )
}
