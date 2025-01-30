interface TranscriptionMessageProps {
  timestamp: string
  text: string
}

export function TranscriptionMessage({
  timestamp,
  text,
}: TranscriptionMessageProps) {
  return (
    <div className="flex items-start gap-3 py-2 animate-fade-in">
      <div className="text-xs text-muted-foreground">{timestamp}</div>
      <div className="bg-muted rounded-lg px-4 py-2 text-sm">{text}</div>
    </div>
  )
}
