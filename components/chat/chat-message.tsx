import { Copy, FileText, User } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ChatMessageProps {
  isUser?: boolean
  children: React.ReactNode
}

export function ChatMessage({ isUser, children }: ChatMessageProps) {
  return (
    <article
      className={cn(
        "flex items-start gap-3 text-[15px] leading-relaxed",
        isUser && "justify-end"
      )}
    >
      <div
        className={cn(
          "rounded-full size-8 flex items-center justify-center",
          isUser
            ? "order-1 bg-primary text-primary-foreground"
            : "bg-muted/50 border"
        )}
      >
        {isUser ? (
          <User size={14} className="text-primary-foreground" />
        ) : (
          <FileText size={14} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 max-w-[90%]">
        <Card
          className={cn(
            "px-4 py-3",
            isUser ? "bg-primary/10 border-primary/20" : "bg-card"
          )}
        >
          <div className="flex flex-col gap-2.5">
            <p className="sr-only">{isUser ? "You" : "AI Assistant"} said:</p>
            {children}
          </div>
        </Card>
        {!isUser && <MessageActions />}
      </div>
    </article>
  )
}

function MessageActions() {
  return (
    <div className="flex mt-1.5 ml-1">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Copy className="size-3 mr-1.5" />
              Copy
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            Copy message
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
