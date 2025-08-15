import { useCopyToClipboard } from "@uidotdev/usehooks"
import { Copy } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MarkdownMessage } from "@/components/ui/markdown-message"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { toast } from "../ui/use-toast"

interface ChatMessageProps {
  isUser?: boolean
  children: React.ReactNode
  content?: string
}

export function ChatMessage({ isUser, children, content }: ChatMessageProps) {
  return (
    <article
      className={cn(
        "flex items-start gap-3 text-[15px] leading-relaxed",
        isUser && "justify-end"
      )}
    >
      <div className="flex-1">
        {isUser ? (
          <Card className={cn("px-4 py-3", "bg-primary/10 border-primary/20")}>
            <div className="flex flex-col gap-2.5">
              <p className="sr-only">You said:</p>
              {children}
            </div>
          </Card>
        ) : content ? (
          <>
            <p className="sr-only">AI Assistant said:</p>
            <MarkdownMessage content={content} />
          </>
        ) : (
          <Card className="px-4 py-3 bg-card">
            <div className="flex flex-col gap-2.5">
              <p className="sr-only">AI Assistant said:</p>
              {children}
            </div>
          </Card>
        )}
        {!isUser && <MessageActions content={content} />}
      </div>
    </article>
  )
}

function MessageActions({ content }: { content?: string }) {
  const [copiedText, copyToClipboard] = useCopyToClipboard()
  const hasCopiedText = Boolean(copiedText)

  return (
    <div className="flex mt-1.5 ml-1">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                copyToClipboard(content || "")
                toast({
                  title: "Copied to clipboard",
                  description: "The message has been copied to your clipboard.",
                  variant: "default",
                })
              }}
              disabled={hasCopiedText}
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
