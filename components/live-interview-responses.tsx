import { useInterviewSessionStore } from "@/stores/interview-session.store"

import { ScrollArea } from "@/components/ui/scroll-area"

export function LiveInterviewResponses() {
  const { messages } = useInterviewSessionStore()

  // Get only analyzed messages
  const analyzedResponses = messages
    .map((m) => m.questionAnalysis)
    .filter((analysis) => analysis !== null)

  return (
    <ScrollArea className="h-[calc(100vh-theme(spacing.52))]">
      <div className="flex flex-col gap-2 p-4 pt-0">
        {analyzedResponses.map((response) => (
          <div
            key={response.id}
            className="space-y-2 flex flex-col items-start gap-2 border p-3 rounded-md text-left text-sm transition-all hover:bg-accent"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-14 text-xs text-muted-foreground">
                {response.createdAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{response.question}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {response.suggestedAnswerPoints.map((suggestion, index) => (
                    <div key={index} className="mb-2">
                      • {suggestion}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {response.keywords.map((keyword, index) => (
                    <div
                      key={index}
                      className="px-2 py-1 bg-muted rounded-full text-xs"
                    >
                      {keyword}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
