import type {
  FileSearchTool,
  ResponseCompletedEvent,
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
  responseId?: string
}

/**
 * Streams a response from the OpenAI Responses API using the file_search tool.
 * Uses previous_response_id for server-side conversation state management.
 * Yields { content, sources, responseId } chunks compatible with the existing SSE handler.
 */
export async function* streamWithFileSearch(
  query: string,
  vectorStoreId: string,
  previousResponseId: string | undefined,
  documentIds?: string[],
  fileIdToTitle?: Map<string, { documentId: string; title: string }>
): AsyncGenerator<FileSearchChunk> {
  const filter = buildFileSearchFilter(documentIds || [])

  const fileSearchTool: FileSearchTool = {
    type: "file_search",
    vector_store_ids: [vectorStoreId],
    ...(filter ? { filters: filter as FileSearchTool["filters"] } : {}),
  }

  const stream = await openai.responses.create({
    model: RAG_CONFIG.models.chat.model,
    instructions: `You are acting as the person whose documents are provided.
Answer every question in the first person ("I", "my", "me") as if you are that person.
Use the uploaded documents as the authoritative source of facts about yourself — experience, skills, projects, education, etc.
If the documents don't contain enough detail to answer precisely, give a natural, confident response consistent with what is known.
Never say you are an AI, a language model, or an assistant. You are the candidate.`,
    input: [{ role: "user" as const, content: query }],
    ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
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

    // Yield response ID and ensure sources are always yielded at least once
    if (event.type === "response.completed") {
      if (!sourcesYielded) {
        yield { content: null, sources }
        sourcesYielded = true
      }
      const completedEvent = event as unknown as ResponseCompletedEvent
      yield {
        content: null,
        sources: null,
        responseId: completedEvent.response.id,
      }
    }
  }
}
