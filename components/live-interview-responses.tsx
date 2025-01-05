import { InterviewResponse } from "@/mocks/data"
import formatDistanceToNow from "date-fns/formatDistanceToNow"

import { cn } from "@/lib/utils"
import { useInterviewResponse } from "@/hooks/use-interview-response"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface LiveInterviewResponsesProps {
  items: InterviewResponse[]
}

export function LiveInterviewResponses({ items }: LiveInterviewResponsesProps) {
  const [interviewResponse, setInterviewResponse] = useInterviewResponse()

  return (
    <ScrollArea className="h-screen">
      <div className="flex flex-col gap-2 p-4 pt-0">
        {items.map((item) => (
          <button
            key={item.id}
            className={cn(
              "flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent",
              interviewResponse.selected === item.id && "bg-muted"
            )}
            onClick={() =>
              setInterviewResponse({
                ...interviewResponse,
                selected: item.id,
              })
            }
          >
            <div className="flex w-full flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-muted-foreground">
                    Response {item.id}
                  </div>
                  <Badge variant="outline">AI Assistant</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.date), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </div>
            <div className="text-sm">{item.text}</div>
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}
