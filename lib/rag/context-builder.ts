import { QueryAnalysis, QueryIntent } from "@/lib/rag/analyzers/query-analyzer"
import { LongTermMemory } from "@/lib/rag/memory/long-term"
import { MemoryEntry } from "@/lib/rag/memory/short-term"

/**
 * Context Builder
 * Builds context for response generation from retrieved documents and memory
 */

export interface RetrievedDocument {
  content: string
  documentId: string
  documentTitle: string
  documentType: string
  relevanceScore: number
}

export interface ContextItem {
  content: string
  source: "document" | "short-term-memory" | "long-term-memory" | "system"
  metadata: Record<string, any>
  relevance: number
}

export interface ContextResponse {
  formattedContext: string
  contextItems: ContextItem[]
}

/**
 * Build context for response generation
 */
export async function buildResponseContext(
  query: string,
  queryAnalysis: QueryAnalysis,
  retrievedDocuments: RetrievedDocument[],
  shortTermMemories: MemoryEntry[],
  longTermMemories: LongTermMemory[],
  options: {
    maxContextLength?: number
    includeSourceMetadata?: boolean
    prioritizeRecency?: boolean
  } = {}
): Promise<ContextResponse> {
  // Default options
  const {
    maxContextLength = 4000,
    includeSourceMetadata = true,
    prioritizeRecency = true,
  } = options

  // Build context items from different sources
  const documentContextItems = buildDocumentContextItems(retrievedDocuments)
  const shortTermMemoryItems = buildShortTermMemoryContextItems(
    shortTermMemories,
    queryAnalysis
  )
  const longTermMemoryItems = buildLongTermMemoryContextItems(
    longTermMemories,
    queryAnalysis
  )

  // Add system context based on query intent
  const systemContextItems = buildSystemContextItems(queryAnalysis.intent)

  // Combine all context items
  let allContextItems: ContextItem[] = [
    ...documentContextItems,
    ...shortTermMemoryItems,
    ...longTermMemoryItems,
    ...systemContextItems,
  ]

  // Sort and filter context items
  allContextItems = await rankAndFilterContextItems(
    allContextItems,
    query,
    queryAnalysis,
    {
      maxContextLength,
      prioritizeRecency,
    }
  )

  // Format the context for the LLM
  const formattedContext = formatContextForLLM(
    allContextItems,
    includeSourceMetadata
  )

  return {
    formattedContext,
    contextItems: allContextItems,
  }
}

/**
 * Build context items from retrieved documents
 */
function buildDocumentContextItems(
  documents: RetrievedDocument[]
): ContextItem[] {
  return documents.map((doc) => ({
    content: doc.content,
    source: "document",
    metadata: {
      documentId: doc.documentId,
      documentTitle: doc.documentTitle,
      documentType: doc.documentType,
    },
    relevance: doc.relevanceScore,
  }))
}

/**
 * Build context items from short-term memory
 */
function buildShortTermMemoryContextItems(
  memories: MemoryEntry[],
  queryAnalysis: QueryAnalysis
): ContextItem[] {
  return memories.map((memory, index) => {
    // More recent messages are more relevant
    const recencyScore = (memories.length - index) / memories.length

    // For clarification queries, recent context is highly relevant
    const isRelevantForIntent =
      queryAnalysis.intent === "CLARIFICATION_QUERY" ? 0.9 : 0.5

    // Calculate combined relevance
    const relevance = Math.min(
      recencyScore * 0.7 + isRelevantForIntent * 0.3,
      1
    )

    return {
      content: `${memory.role}: ${memory.content}`,
      source: "short-term-memory",
      metadata: {
        timestamp: memory.timestamp,
        messageId: memory.id,
        role: memory.role,
      },
      relevance,
    }
  })
}

/**
 * Build context items from long-term memory
 */
function buildLongTermMemoryContextItems(
  memories: LongTermMemory[],
  queryAnalysis: QueryAnalysis
): ContextItem[] {
  return memories.map((memory) => ({
    content: memory.content,
    source: "long-term-memory",
    metadata: {
      category: memory.category,
      timestamp: memory.createdAt,
      memoryId: memory.id,
    },
    relevance: memory.importance,
  }))
}

/**
 * Build system context items based on query intent
 */
function buildSystemContextItems(intent: QueryIntent): ContextItem[] {
  const systemContexts: Record<QueryIntent, string> = {
    FACTUAL_QUERY:
      "The user is looking for specific facts or information. Provide precise, accurate information from the documents.",
    CONCEPTUAL_QUERY:
      "The user wants to understand a concept or idea. Provide a clear explanation based on the documents.",
    COMPARISON_QUERY:
      "The user wants to compare different items or concepts. Highlight similarities and differences from the documents.",
    PROCEDURAL_QUERY:
      "The user wants to know how to do something. Provide step-by-step instructions from the documents.",
    EXAMPLE_REQUEST:
      "The user is asking for examples. Provide specific examples from the documents.",
    DEFINITION_QUERY:
      "The user wants to know the meaning of a term or concept. Provide a clear definition from the documents.",
    OPINION_QUERY:
      "The user is asking for an opinion or evaluation. Present balanced information from the documents without personal bias.",
    CLARIFICATION_QUERY:
      "The user is asking for clarification about something previously discussed. Reference the conversation history.",
    UNKNOWN:
      "Provide a helpful response based on the documents and conversation context.",
  }

  return [
    {
      content: systemContexts[intent],
      source: "system",
      metadata: {
        type: "query_guidance",
        intent,
      },
      relevance: 0.8, // High relevance for system guidance
    },
  ]
}

/**
 * Rank and filter context items to fit within constraints
 */
async function rankAndFilterContextItems(
  contextItems: ContextItem[],
  query: string,
  queryAnalysis: QueryAnalysis,
  options: {
    maxContextLength: number
    prioritizeRecency: boolean
  }
): Promise<ContextItem[]> {
  // Sort by relevance score
  let sorted = [...contextItems].sort((a, b) => b.relevance - a.relevance)

  // Adjust document relevance based on query intent
  sorted = sorted.map((item) => {
    if (item.source === "document") {
      // Boost or reduce relevance based on document type and query intent
      const { documentType } = item.metadata
      let intentBoost = 0

      if (
        queryAnalysis.intent === "FACTUAL_QUERY" &&
        documentType === "NOTES"
      ) {
        intentBoost = 0.1 // Slight boost for notes in factual queries
      } else if (
        queryAnalysis.intent === "PROCEDURAL_QUERY" &&
        documentType === "PORTFOLIO"
      ) {
        intentBoost = 0.15 // Portfolio items often contain process descriptions
      } else if (
        queryAnalysis.intent === "CONCEPTUAL_QUERY" &&
        documentType === "RESUME"
      ) {
        intentBoost = -0.05 // Resume may be less helpful for conceptual queries
      }

      return {
        ...item,
        relevance: Math.min(item.relevance + intentBoost, 1),
      }
    }
    return item
  })

  // Re-sort after adjustments
  sorted = sorted.sort((a, b) => b.relevance - a.relevance)

  // Calculate approximate token counts (rough estimate)
  const estimateTokens = (text: string): number => Math.ceil(text.length / 4)

  // Select items until we hit the limit
  let currentLength = 0
  const selected: ContextItem[] = []

  // Always include system guidance
  const systemItems = sorted.filter((item) => item.source === "system")
  for (const item of systemItems) {
    selected.push(item)
    currentLength += estimateTokens(item.content)
  }

  // Include conversation context for certain query types
  if (["CLARIFICATION_QUERY", "OPINION_QUERY"].includes(queryAnalysis.intent)) {
    // Prioritize conversation context
    const conversationItems = sorted.filter(
      (item) => item.source === "short-term-memory" && item.relevance > 0.5
    )

    for (const item of conversationItems) {
      if (
        currentLength + estimateTokens(item.content) <=
        options.maxContextLength
      ) {
        selected.push(item)
        currentLength += estimateTokens(item.content)
      }
    }
  }

  // Add remaining items by relevance until we hit the limit
  for (const item of sorted) {
    // Skip if already added
    if (selected.some((i) => i === item)) {
      continue
    }

    const tokenEstimate = estimateTokens(item.content)
    if (currentLength + tokenEstimate <= options.maxContextLength) {
      selected.push(item)
      currentLength += tokenEstimate
    }
  }

  return selected
}

/**
 * Format context items into a string for the LLM
 */
function formatContextForLLM(
  contextItems: ContextItem[],
  includeSourceMetadata: boolean
): string {
  // Group by source type
  const documentItems = contextItems.filter(
    (item) => item.source === "document"
  )
  const shortTermMemoryItems = contextItems.filter(
    (item) => item.source === "short-term-memory"
  )
  const longTermMemoryItems = contextItems.filter(
    (item) => item.source === "long-term-memory"
  )
  const systemItems = contextItems.filter((item) => item.source === "system")

  let formattedContext = ""

  // Add system guidance
  if (systemItems.length > 0) {
    formattedContext += "### System Guidance\n"
    formattedContext +=
      systemItems.map((item) => item.content).join("\n") + "\n\n"
  }

  // Add conversation context
  if (shortTermMemoryItems.length > 0) {
    formattedContext += "### Conversation History\n"
    formattedContext +=
      shortTermMemoryItems
        .sort(
          (a, b) =>
            (a.metadata.timestamp as Date).getTime() -
            (b.metadata.timestamp as Date).getTime()
        )
        .map((item) => item.content)
        .join("\n") + "\n\n"
  }

  // Add document contexts
  if (documentItems.length > 0) {
    formattedContext += "### Document Context\n"

    for (const item of documentItems) {
      if (includeSourceMetadata) {
        formattedContext += `--- From ${item.metadata.documentTitle} (${item.metadata.documentType}) ---\n`
      }
      formattedContext += item.content + "\n\n"
    }
  }

  // Add long-term memory insights
  if (longTermMemoryItems.length > 0) {
    formattedContext += "### User Preferences and History\n"
    formattedContext +=
      longTermMemoryItems.map((item) => item.content).join("\n") + "\n\n"
  }

  return formattedContext.trim()
}
