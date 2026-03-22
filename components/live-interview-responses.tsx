import { useInterviewSessionStore } from "@/stores/interview-session.store"

import { ScrollArea } from "@/components/ui/scroll-area"

export function LiveInterviewResponses() {
  const { messages } = useInterviewSessionStore()

  const analyzedResponses = messages
    .map((m) => m.questionAnalysis)
    .filter((analysis) => analysis !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-4 pt-0">
        {analyzedResponses.map((response) => (
          <div
            key={response.id}
            className="flex flex-col gap-1 border p-3 rounded-md text-left text-sm transition-all hover:bg-accent"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-14 text-xs text-muted-foreground shrink-0">
                {response.createdAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm mb-2">
                  {response.question}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {response.suggestedAnswer}
                  {response.suggestedAnswer.length === 0 && (
                    <span className="inline-block w-2 h-3 bg-muted-foreground/50 animate-pulse rounded-sm" />
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
