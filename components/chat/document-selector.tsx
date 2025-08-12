"use client"

import { useState } from "react"
import Link from "next/link"
import { useChatDocumentStore } from "@/stores/chat-document-store"
import { Check, ExternalLink, FileText, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { useGetDocuments } from "@/hooks/api/document/useGetDocuments"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { Icons } from "@/components/icons"

const documentTypeColors = {
  RESUME: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  JOB_DESCRIPTION:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  PORTFOLIO:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  COVER_LETTER:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  NOTES: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
}

export default function DocumentSelector() {
  const { selectedDocuments, toggleDocument } = useChatDocumentStore()

  const { documents, isLoading } = useGetDocuments()

  const [searchQuery, setSearchQuery] = useState("")

  const filteredDocuments = documents?.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="h-full flex flex-col border-l bg-card">
        <div className="p-4">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <FileText className="size-4" />
            Documents
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Icons.spinner className="size-6 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col border-l bg-card">
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search documents..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 grid grid-cols-1 gap-1">
          {filteredDocuments && filteredDocuments.length > 0 ? (
            filteredDocuments.map((document) => {
              const isSelected = selectedDocuments.includes(document.id)
              const typeColor =
                documentTypeColors[
                  document.type as keyof typeof documentTypeColors
                ] || ""

              const formattedDate = new Date(
                document.createdAt
              ).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })

              return (
                <div
                  key={document.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/10 border-primary/30 border"
                      : "hover:bg-muted/50 border border-muted"
                  }`}
                  onClick={() => toggleDocument(document.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">
                          {document.title}
                        </h4>
                        {isSelected && (
                          <Check className="size-3.5 text-primary shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${typeColor}`}
                        >
                          {document.type?.toLowerCase().replace("_", " ")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <EmptyPlaceholder className="border-dashed mx-2 mt-4">
              <EmptyPlaceholder.Icon name="fileText" />
              <EmptyPlaceholder.Title>No documents</EmptyPlaceholder.Title>
              <EmptyPlaceholder.Description>
                Upload some documents to start chatting.
              </EmptyPlaceholder.Description>
              <Link
                className={cn(
                  buttonVariants({ variant: "outline", className: "w-full" })
                )}
                href="/dashboard/documents"
              >
                Upload Documents <ExternalLink className="size-4" />
              </Link>
            </EmptyPlaceholder>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
