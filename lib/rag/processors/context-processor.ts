import { DocumentType } from "@prisma/client"

import { db } from "@/lib/db"

export interface ContextRequest {
  userId: string
  selectedDocuments: string[]
  query: string
}

export interface DocumentContext {
  id: string
  title: string
  type: DocumentType
  content: string
  chunks: Array<{
    content: string
    metadata: any
  }>
  relevantChunks: Array<{
    content: string
    relevanceScore: number
  }>
}

/**
 * Build context from selected documents for a specific query
 */
export async function buildDocumentContext({
  userId,
  selectedDocuments,
  query,
}: ContextRequest): Promise<DocumentContext[]> {
  try {
    // Get the selected documents with their chunks
    const documents = await db.document.findMany({
      where: {
        id: { in: selectedDocuments },
        userId,
      },
      include: {
        chunks: {
          select: {
            content: true,
            metadata: true,
            embedding: true,
          },
        },
      },
    })

    // For now, return all chunks. Later we can implement more sophisticated filtering
    const documentContexts: DocumentContext[] = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      content: doc.content,
      chunks: doc.chunks.map((chunk) => ({
        content: chunk.content,
        metadata: chunk.metadata || {},
      })),
      relevantChunks: doc.chunks.map((chunk) => ({
        content: chunk.content,
        relevanceScore: 1.0, // Default relevance, can be enhanced with similarity calculation
      })),
    }))

    return documentContexts
  } catch (error) {
    console.error("Error building document context:", error)
    throw new Error("Failed to build document context")
  }
}

/**
 * Filter and rank document chunks based on query relevance
 */
export function rankChunksByRelevance(
  chunks: Array<{ content: string; metadata: any }>,
  query: string
): Array<{ content: string; relevanceScore: number; metadata: any }> {
  // Simple keyword-based relevance scoring
  const queryWords = query.toLowerCase().split(/\s+/)

  return chunks
    .map((chunk) => {
      const content = chunk.content.toLowerCase()
      let score = 0

      // Count keyword matches
      queryWords.forEach((word) => {
        const matches = (content.match(new RegExp(word, "g")) || []).length
        score += matches
      })

      // Normalize score by content length
      const normalizedScore = score / content.split(/\s+/).length

      return {
        ...chunk,
        relevanceScore: Math.min(normalizedScore * 10, 1.0), // Cap at 1.0
      }
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .filter((chunk) => chunk.relevanceScore > 0) // Only return relevant chunks
}

/**
 * Merge contexts from multiple documents
 */
export function mergeDocumentContexts(
  contexts: DocumentContext[],
  maxChunks: number = 10
): {
  mergedContent: string
  sources: Array<{
    documentId: string
    documentTitle: string
    chunkContent: string
    relevanceScore: number
  }>
} {
  const allChunks: Array<{
    documentId: string
    documentTitle: string
    chunkContent: string
    relevanceScore: number
  }> = []

  // Collect all relevant chunks from all documents
  contexts.forEach((context) => {
    context.relevantChunks.forEach((chunk) => {
      allChunks.push({
        documentId: context.id,
        documentTitle: context.title,
        chunkContent: chunk.content,
        relevanceScore: chunk.relevanceScore,
      })
    })
  })

  // Sort by relevance and take top chunks
  const topChunks = allChunks
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxChunks)

  // Merge content
  const mergedContent = topChunks
    .map((chunk, index) => `[${index + 1}] ${chunk.chunkContent}`)
    .join("\n\n")

  return {
    mergedContent,
    sources: topChunks,
  }
}
