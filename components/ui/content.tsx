"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

import { Button } from "./button"

interface ContentDataProps extends React.HTMLAttributes<string> {}

const ContentData = React.forwardRef<HTMLDivElement, ContentDataProps>(
  ({ className, ...props }, ref) => {
    const [expanded, setExpanded] = React.useState(false)

    return (
      <div className={cn("pt-0", className)} ref={ref}>
        {expanded ? (
          <>
            <div>{props.children}</div>
            <Button
              type="button"
              variant="link"
              className="text-xs underline"
              onClick={() => setExpanded(false)}
            >
              show less
            </Button>
          </>
        ) : (
          <div>
            <div className="line-clamp-2">{props.children}</div>
            <Button
              type="button"
              variant="link"
              className="text-xs underline"
              onClick={() => setExpanded(true)}
            >
              show more
            </Button>
          </div>
        )}
      </div>
    )
  }
)
ContentData.displayName = "ContentData"

export { ContentData }
