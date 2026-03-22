import type {
  EasyInputMessage,
  FileSearchTool,
  ResponseOutputTextAnnotationAddedEvent,
  ResponseTextDeltaEvent,
} from "openai/resources/responses/responses"

import { RAG_CONFIG } from "@/config/rag"
import openai from "@/lib/openai"

import { buildFileSearchFilter } from "./vector-store-service"

export interface FileSearchSource {
  documentId: string
  documentTitle: string
  quote: string
  fileId: string
}

export interface FileSearchChunk {
  content: string | null
  sources: FileSearchSource[] | null
}

/**
 * Streams a response from the OpenAI Responses API using the file_search tool.
 * Yields { content, sources } chunks compatible with the existing SSE handler.
 */
export async function* streamWithFileSearch(
  query: string,
  vectorStoreId: string,
  conversationMessages: Array<{ role: "user" | "assistant"; content: string }>,
  documentIds?: string[],
  fileIdToTitle?: Map<string, { documentId: string; title: string }>
): AsyncGenerator<FileSearchChunk> {
  const filter = buildFileSearchFilter(documentIds || [])

  const fileSearchTool: FileSearchTool = {
    type: "file_search",
    vector_store_ids: [vectorStoreId],
    ...(filter ? { filters: filter as FileSearchTool["filters"] } : {}),
  }

  const input: EasyInputMessage[] = [
    ...conversationMessages.map((m) => ({
      role: m.role as EasyInputMessage["role"],
      content: m.content,
    })),
    { role: "user" as const, content: query },
  ]

  const stream = await openai.responses.create({
    model: RAG_CONFIG.models.chat.model,
    input,
    tools: [fileSearchTool],
    stream: true,
    temperature: RAG_CONFIG.models.chat.temperature,
    max_output_tokens: RAG_CONFIG.models.chat.maxTokens,
  })

  const sources: FileSearchSource[] = []
  let sourcesYielded = false

  for await (const event of stream) {
    // Collect file citations
    if (event.type === "response.output_text_annotation.added") {
      const annotationEvent =
        event as unknown as ResponseOutputTextAnnotationAddedEvent
      const annotation = annotationEvent.annotation as any
      if (annotation?.type === "file_citation") {
        const fileId: string = annotation.file_id || ""
        const quote: string = annotation.quote || ""
        const meta = fileIdToTitle?.get(fileId)
        sources.push({
          documentId: meta?.documentId || "",
          documentTitle: meta?.title || fileId,
          quote,
          fileId,
        })
      }
    }

    // Yield sources once before the first content chunk
    if (event.type === "response.output_text.delta") {
      const deltaEvent = event as ResponseTextDeltaEvent
      if (!sourcesYielded) {
        yield { content: null, sources }
        sourcesYielded = true
      }
      yield { content: deltaEvent.delta, sources: null }
    }

    // Ensure sources are always yielded at least once
    if (event.type === "response.completed" && !sourcesYielded) {
      yield { content: null, sources }
      sourcesYielded = true
    }
  }
}
