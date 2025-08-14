import { DocumentType } from "@prisma/client";



import { db } from "@/lib/db";
import { RAG_CONFIG } from "@/lib/rag/config"
import { embedText, stringToEmbedding } from "@/lib/rag/embedding"

import * as vectorStore from "./vector-store"

/**
 * Retrieve relevant content for a query
 */
export async function retrieveRelevantContent(
  query: string,
  userId: string,
  options: {
    documentTypes?: DocumentType[]
    documentIds?: string[]
    maxResults?: number
    similarityThreshold?: number
    sessionId?: string
  } = {}
): Promise<
  Array<{
    content: string
    metadata: any
    score: number
    source: string
  }>
> {
  const {
    documentTypes,
    documentIds,
    maxResults = RAG_CONFIG.search.maxResults,
    similarityThreshold = RAG_CONFIG.search.similarityThreshold,
    sessionId,
  } = options

  try {
    // Perform both vector and keyword search
    const [vectorResults, keywordResults] = await Promise.all([
      vectorSearch(query, userId, {
        documentTypes,
        documentIds,
        maxResults,
        sessionId,
      }),
      keywordSearch(query, userId, {
        documentTypes,
        documentIds,
        maxResults,
      }),
    ])

    // Enhanced logging for debugging
    console.log(`Vector search returned ${vectorResults.length} results`)
    console.log(`Keyword search returned ${keywordResults.length} results`)

    // Log vector search scores
    if (vectorResults.length > 0) {
      console.log(
        "Vector scores:",
        vectorResults.slice(0, 3).map((r) => r.score)
      )
      console.log(
        "Sample vector result:",
        JSON.stringify(
          {
            score: vectorResults[0].score,
            metadata: vectorResults[0].metadata,
            source: vectorResults[0].source,
          },
          null,
          2
        )
      )
    }

    // Log keyword search scores
    if (keywordResults.length > 0) {
      console.log(
        "Keyword scores:",
        keywordResults.slice(0, 3).map((r) => r.score)
      )
      console.log(
        "Sample keyword result:",
        JSON.stringify(
          {
            score: keywordResults[0].score,
            metadata: keywordResults[0].metadata,
            source: keywordResults[0].source,
          },
          null,
          2
        )
      )
    }

    // Combine and rank results
    const combinedResults = combineResults(
      vectorResults,
      keywordResults,
      RAG_CONFIG.search.hybridSearchWeight
    )

    // Log combined results
    if (combinedResults.length > 0) {
      console.log(
        "Combined scores:",
        combinedResults.slice(0, 3).map((r) => r.score)
      )
    }

    // Filter by similarity threshold
    const filteredResults = combinedResults.filter(
      (result) => result.score >= similarityThreshold
    )

    // Log filtered results
    console.log(
      `After filtering by threshold ${similarityThreshold}: ${filteredResults.length} results remain`
    )

    // Log the retrieval for analytics
    await logRetrievalQuery(userId, query, filteredResults, sessionId)

    return filteredResults.slice(0, maxResults)
  } catch (error) {
    console.error("Error retrieving content:", error)
    throw new Error("Failed to retrieve relevant content")
  }
}

/**
 * Vector-based search using embeddings
 */
async function vectorSearch(
  query: string,
  userId: string,
  options: {
    documentTypes?: DocumentType[]
    documentIds?: string[]
    maxResults?: number
    sessionId?: string
  }
): Promise<
  Array<{ content: string; metadata: any; score: number; source: string }>
> {
  const {
    documentTypes,
    documentIds,
    maxResults = RAG_CONFIG.search.maxResults,
  } = options

  try {
    // Always generate a fresh embedding for queries to ensure consistency with document embeddings
    const queryEmbedding = await embedText(query) // Use embedText directly instead of stringToEmbedding

    // Build filter for document types and IDs
    let filter: Record<string, any> = { userId }

    if (documentTypes && documentTypes.length > 0) {
      // Use the correct metadata field path for document type
      filter["documentType"] = { $in: documentTypes }
    }

    if (documentIds && documentIds.length > 0) {
      // Use the correct metadata field path for document ID
      filter["documentId"] = { $in: documentIds }
    }

    // Log the filter for debugging
    console.log(`Vector search filter:`, JSON.stringify(filter, null, 2))

    // Query vector store
    const results = await vectorStore.searchSimilar(
      queryEmbedding,
      maxResults,
      filter
    )

    // Log results for debugging
    console.log(`Vector store returned ${results.length} matches`)

    // Format results
    return results.map((result) => ({
      content: result.metadata?.content || "",
      metadata: {
        documentId: result.metadata?.documentId || "",
        documentTitle: result.metadata?.documentTitle || "Unknown",
        documentType: result.metadata?.documentType || "NOTES",
        chunkIndex: result.metadata?.chunkIndex || 0,
      },
      score: result.score,
      source: "vector",
    }))
  } catch (error) {
    // Structured error handling with context
    const errorDetails = {
      operation: "vectorSearch",
      queryLength: query.length,
      error: error instanceof Error ? error.message : String(error),
    }

    console.error(
      "Error in vector search:",
      JSON.stringify(errorDetails, null, 2)
    )

    // Try to identify the specific error type for better debugging
    if (error instanceof Error) {
      if (error.message.includes("dimension")) {
        console.error(
          "Vector dimension mismatch detected. Check embedding configuration."
        )
      } else if (
        error.message.includes("auth") ||
        error.message.includes("key")
      ) {
        console.error("Possible authentication issue with vector database.")
      } else if (
        error.message.includes("timeout") ||
        error.message.includes("network")
      ) {
        console.error("Network or timeout issue with vector database.")
      }
    }

    return []
  }
}

/**
 * Keyword-based search for documents
 */
async function keywordSearch(
  query: string,
  userId: string,
  options: {
    documentTypes?: DocumentType[]
    documentIds?: string[]
    maxResults?: number
  }
): Promise<
  Array<{ content: string; metadata: any; score: number; source: string }>
> {
  const {
    documentTypes,
    documentIds,
    maxResults = RAG_CONFIG.search.maxResults,
  } = options

  try {
    // Create database filter
    const whereClause: Record<string, any> = {
      document: {
        userId,
      },
    }

    if (documentTypes && documentTypes.length > 0) {
      whereClause.document.type = {
        in: documentTypes,
      }
    }

    if (documentIds && documentIds.length > 0) {
      whereClause.documentId = {
        in: documentIds,
      }
    }

    // Break query into keywords
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .filter(
        (word) =>
          !["the", "and", "or", "but", "a", "an", "is", "are", "was"].includes(
            word
          )
      )

    if (keywords.length === 0) {
      return []
    }

    // Add text search condition for each keyword
    const orConditions = keywords.map((keyword) => ({
      content: {
        contains: keyword,
        mode: "insensitive" as const,
      },
    }))

    whereClause.OR = orConditions

    // Query database
    const chunks = await db.documentChunk.findMany({
      where: whereClause,
      take: maxResults * 2, // Get more results than needed for better scoring
      include: {
        document: {
          select: {
            title: true,
            type: true,
          },
        },
      },
    })

    // Score results based on keyword matches
    const scoredResults = chunks.map((chunk) => {
      // Calculate keyword match score
      let score = 0
      const content = chunk.content.toLowerCase()

      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          // Add score based on match frequency (increased weight per match)
          const regex = new RegExp(keyword, "gi")
          const matches = content.match(regex) || []
          score += matches.length * 0.25 // Increased from 0.1 to 0.25
        }
      }

      // Normalize score between 0 and 1
      score = Math.min(score, 1)

      return {
        content: chunk.content,
        metadata: {
          documentId: chunk.documentId,
          documentTitle: chunk.document.title,
          documentType: chunk.document.type,
          chunkIndex: chunk.chunkIndex,
        },
        score,
        source: "keyword",
      }
    })

    // Sort by score and limit results
    return scoredResults.sort((a, b) => b.score - a.score).slice(0, maxResults)
  } catch (error) {
    console.error("Error in keyword search:", error)
    return []
  }
}

/**
 * Combine results from vector and keyword searches
 */
function combineResults(
  vectorResults: Array<{
    content: string
    metadata: any
    score: number
    source: string
  }>,
  keywordResults: Array<{
    content: string
    metadata: any
    score: number
    source: string
  }>,
  vectorWeight: number = 0.7
): Array<{ content: string; metadata: any; score: number; source: string }> {
  const keywordWeight = 1 - vectorWeight
  const combinedMap = new Map<
    string,
    { content: string; metadata: any; score: number; source: string }
  >()

  // Process vector results
  for (const result of vectorResults) {
    const key = `${result.metadata.documentId}-${result.metadata.chunkIndex}`
    combinedMap.set(key, {
      ...result,
      score: result.score * vectorWeight,
      source: "hybrid",
    })
  }

  // Process keyword results
  for (const result of keywordResults) {
    const key = `${result.metadata.documentId}-${result.metadata.chunkIndex}`
    if (combinedMap.has(key)) {
      // Update score for duplicate result
      const existing = combinedMap.get(key)!
      existing.score += result.score * keywordWeight
      existing.score = Math.min(existing.score, 1) // Cap at 1
    } else {
      combinedMap.set(key, {
        ...result,
        score: result.score * keywordWeight,
        source: "hybrid",
      })
    }
  }

  // Convert map to array and sort by score
  return Array.from(combinedMap.values()).sort((a, b) => b.score - a.score)
}

/**
 * Log retrieval queries for analytics and improvement
 */
async function logRetrievalQuery(
  userId: string,
  query: string,
  results: Array<{
    content: string
    metadata: any
    score: number
    source: string
  }>,
  sessionId?: string
): Promise<void> {
  try {
    // Log to database if table exists, otherwise just log to console
    try {
      // Prepare the data to insert
      const data: any = {
        userId,
        query,
        results: results.map((r) => ({
          documentId: r.metadata.documentId,
          content: r.content.substring(0, 100), // Store beginning of content
          score: r.score,
          source: r.source,
        })),
        relevanceScore: results.length > 0 ? results[0].score : 0,
      }

      // Only include sessionId if it exists
      if (sessionId) {
        // Check if the session exists first
        const sessionExists = await db.interviewSession.findUnique({
          where: { id: sessionId },
          select: { id: true },
        })

        // Only add sessionId to the data if the session exists
        if (sessionExists) {
          data.sessionId = sessionId
        }
      }

      await db.rAGQueryLog.create({ data })
    } catch (dbError) {
      console.log(
        "Error logging to RAGQueryLog, falling back to RetrievalLog:",
        dbError
      )

      // Fallback to RetrievalLog table
      try {
        await db.retrievalLog.create({
          data: {
            userId,
            query,
            sessionId: null, // RetrievalLog doesn't have a foreign key constraint
            resultCount: results.length,
            topScore: results.length > 0 ? results[0].score : 0,
            avgScore:
              results.length > 0
                ? results.reduce((sum, r) => sum + r.score, 0) / results.length
                : 0,
            results: results.map((r) => ({
              documentId: r.metadata.documentId,
              content: r.content.substring(0, 100),
              score: r.score,
              source: r.source,
            })),
          },
        })
      } catch (fallbackError) {
        console.error("Error logging to RetrievalLog fallback:", fallbackError)
      }
    }
  } catch (error) {
    console.error("Error logging retrieval:", error)
    // Non-critical error, don't throw
  }
}

/**
 * Get a summary of the user's knowledge base
 */
export async function getKnowledgeBaseSummary(userId: string): Promise<{
  documentCount: number
  documentTypes: { type: DocumentType; count: number }[]
  chunkCount: number
}> {
  try {
    // Get document counts by type
    const documentCounts = await db.document.groupBy({
      by: ["type"],
      where: {
        userId,
      },
      _count: {
        id: true,
      },
    })

    // Get total chunk count
    const totalChunks = await db.documentChunk.count({
      where: {
        document: {
          userId,
        },
      },
    })

    return {
      documentCount: documentCounts.reduce(
        (sum, item) => sum + item._count.id,
        0
      ),
      documentTypes: documentCounts.map((item) => ({
        type: item.type,
        count: item._count.id,
      })),
      chunkCount: totalChunks,
    }
  } catch (error) {
    console.error("Error getting knowledge base summary:", error)
    return {
      documentCount: 0,
      documentTypes: [],
      chunkCount: 0,
    }
  }
}