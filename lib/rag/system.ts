import { DocumentType } from "@prisma/client"

import { db } from "@/lib/db"

import { stringToEmbedding } from "./embedding"
import {
  getContextualMemories,
  getPersonalizedContext,
  storeInteraction as memoryStoreInteraction,
  storeMemory,
  storeSessionInsights,
} from "./memory/orchestrator"
import * as documentProcessor from "./processors/document"
import { getKnowledgeBaseSummary, retrieveRelevantContent } from "./retrieval"
import * as vectorStore from "./vector-store"

/**
 * Sync document chunks with vector store
 */
export async function syncDocumentToVectorStore(
  documentId: string
): Promise<void> {
  try {
    // Get document chunks with embeddings
    const chunks = await db.documentChunk.findMany({
      where: { documentId },
      include: { document: true },
    })

    if (chunks.length === 0) {
      console.log(`No chunks found for document ${documentId}`)
      return
    }

    // Prepare vectors for upsert
    const vectors = await Promise.all(
      chunks.map(async (chunk) => {
        // Convert embedding string back to array
        const embeddingArray = await stringToEmbedding(chunk.embedding || "")

        // Extract metadata as an object, or use empty object if null
        const chunkMetadata = (chunk.metadata as Record<string, any>) || {}

        return {
          id: chunk.id,
          values: embeddingArray,
          metadata: {
            chunkId: chunk.id,
            documentId: chunk.documentId,
            content: chunk.content.substring(0, 1000), // Include truncated content in metadata
            userId: chunk.document.userId,
            documentType: chunk.document.type,
            chunkIndex: chunk.chunkIndex,
            documentTitle:
              chunkMetadata.documentTitle || chunk.document.title || "Unknown",
            ...chunkMetadata,
          },
        }
      })
    )

    // Upsert vectors in batches
    const batchSize = 100
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize)
      await vectorStore.upsertVectors(batch)
    }

    console.log(
      `Synced ${vectors.length} vectors for document ${documentId} to vector store`
    )
  } catch (error) {
    console.error(
      `Error syncing document ${documentId} to vector store:`,
      error
    )
    throw new Error("Failed to sync document to vector store")
  }
}

/**
 * Process and index a document
 */
export async function processDocument(
  userId: string,
  title: string,
  content: string,
  type: DocumentType,
  metadata?: Record<string, any>
): Promise<string> {
  try {
    // Process document and create chunks with embeddings
    const documentId = await documentProcessor.processDocument(
      userId,
      title,
      content,
      type,
      metadata
    )

    // Sync with vector store
    await syncDocumentToVectorStore(documentId)

    return documentId
  } catch (error) {
    console.error("Error processing document:", error)
    throw new Error("Failed to process document")
  }
}

/**
 * TODO: Generate response suggestions for an interview question
 */
export async function generateResponseSuggestions(
  userId: string,
  sessionId: string,
  question: string,
  interviewType?: string
): Promise<{
  suggestions: string[]
  relevantExperience: string[]
  frameworks: string[]
  context: string
}> {
  try {
    // Retrieve relevant content from knowledge base
    const relevantContent = await retrieveRelevantContent(question, userId, {
      maxResults: 10,
      sessionId,
    })

    // Get personalized context from memory system
    const personalizedContext = await getPersonalizedContext(
      userId,
      sessionId,
      question
    )

    // Store the question in memory
    await storeMemory(
      userId,
      sessionId,
      `Interview question: ${question}`,
      {
        type: "interview_question",
        interviewType,
        timestamp: new Date().toISOString(),
      },
      0.6
    )

    // Extract suggestions from relevant content
    const suggestions = extractSuggestions(relevantContent, question)
    const relevantExperience = extractExperience(relevantContent)
    const frameworks = extractFrameworks(question, interviewType)

    return {
      suggestions,
      relevantExperience,
      frameworks,
      context: personalizedContext,
    }
  } catch (error) {
    console.error("Error generating response suggestions:", error)
    throw new Error("Failed to generate response suggestions")
  }
}

/**
 * Store user interaction and feedback
 */
export async function storeInteraction(
  userId: string,
  sessionId: string,
  question: string,
  userResponse?: string,
  systemSuggestions?: string[],
  feedback?: {
    helpful: boolean
    accuracy: number
    relevance: number
  }
): Promise<void> {
  try {
    const responseText = userResponse || systemSuggestions?.join("; ") || ""

    await memoryStoreInteraction(
      userId,
      sessionId,
      question,
      responseText,
      feedback
    )
  } catch (error) {
    console.error("Error storing interaction:", error)
  }
}

/**
 * Complete interview session and store insights
 */
export async function completeInterviewSession(
  userId: string,
  sessionId: string,
  sessionData: {
    duration: number
    questionsAnswered: number
    overallScore?: number
    strengths?: string[]
    weaknesses?: string[]
    improvements?: string[]
  }
): Promise<void> {
  try {
    // Store session insights
    if (
      sessionData.strengths ||
      sessionData.weaknesses ||
      sessionData.improvements
    ) {
      await storeSessionInsights(userId, sessionId, {
        strengths: sessionData.strengths || [],
        weaknesses: sessionData.weaknesses || [],
        improvements: sessionData.improvements || [],
        overallScore: sessionData.overallScore,
      })
    }

    // Store session summary
    await storeMemory(
      userId,
      sessionId,
      `Interview session completed: ${
        sessionData.questionsAnswered
      } questions in ${Math.round(sessionData.duration / 60)} minutes`,
      {
        type: "session_summary",
        ...sessionData,
        timestamp: new Date().toISOString(),
      },
      0.8
    )

    console.log(`Interview session ${sessionId} completed and insights stored`)
  } catch (error) {
    console.error("Error completing interview session:", error)
  }
}

/**
 * Get user's knowledge base summary
 */
export async function getUserKnowledgeBaseSummary(
  userId: string
): Promise<any> {
  return await getKnowledgeBaseSummary(userId)
}

/**
 * Get user's performance trends
 */
export async function getPerformanceTrends(userId: string): Promise<any> {
  const trends = await getContextualMemories(userId, "", "")
  return trends
}

/**
 * Process document content for existing document (reprocessing)
 */
export async function processDocumentContent(
  documentId: string,
  content: string,
  type: DocumentType,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Reprocess the document content
    await documentProcessor.processExistingDocument(
      documentId,
      content,
      type,
      metadata || {}
    )

    // Sync with vector store
    await syncDocumentToVectorStore(documentId)
  } catch (error) {
    console.error("Error reprocessing document content:", error)
    throw new Error("Failed to reprocess document content")
  }
}

/**
 * Remove document from vector store (cleanup)
 */
export async function removeDocumentFromVectorStore(
  documentId: string
): Promise<void> {
  try {
    // Get document chunks to find their IDs
    const chunks = await db.documentChunk.findMany({
      where: { documentId },
      select: { id: true },
    })

    // Delete vectors from Pinecone
    const chunkIds = chunks.map((chunk) => chunk.id)
    if (chunkIds.length > 0) {
      await vectorStore.deleteVectors(chunkIds)
    }

    console.log(
      `Removed ${chunkIds.length} vectors for document ${documentId} from vector store`
    )
  } catch (error) {
    console.warn("Warning: Failed to clean up vector store:", error)
    // Don't throw error for vector store cleanup failures
  }
}

/**
 * Extract response suggestions from relevant content
 */
function extractSuggestions(
  relevantContent: Array<{ content: string; metadata: any; score: number }>,
  question: string
): string[] {
  const suggestions: string[] = []

  // Group content by type and extract key points
  relevantContent.forEach((item) => {
    if (item.score > 0.6) {
      // Only high-relevance content
      const content = item.content

      // Extract bullet points or sentences that could be suggestions
      const lines = content
        .split("\n")
        .filter((line) => line.trim().length > 20)
      lines.forEach((line) => {
        if (line.includes("•") || line.includes("-") || line.includes("*")) {
          suggestions.push(line.replace(/[•\-\*]/g, "").trim())
        }
      })
    }
  })

  // Remove duplicates and return top suggestions
  const uniqueSuggestions = Array.from(new Set(suggestions))
  return uniqueSuggestions.slice(0, 5)
}

/**
 * Extract relevant experience from content
 */
function extractExperience(
  relevantContent: Array<{ content: string; metadata: any; score: number }>
): string[] {
  const experiences: string[] = []

  relevantContent.forEach((item) => {
    if (item.metadata?.documentType === "RESUME" && item.score > 0.5) {
      const content = item.content

      // Look for experience-related content
      if (
        content.toLowerCase().includes("experience") ||
        content.toLowerCase().includes("project") ||
        content.toLowerCase().includes("work")
      ) {
        experiences.push(content.substring(0, 200) + "...")
      }
    }
  })

  return experiences.slice(0, 3)
}

/**
 * Extract response frameworks based on question type
 */
function extractFrameworks(question: string, interviewType?: string): string[] {
  const frameworks: string[] = []
  const questionLower = question.toLowerCase()

  // Behavioral questions
  if (
    questionLower.includes("tell me about a time") ||
    questionLower.includes("describe a situation") ||
    questionLower.includes("give me an example")
  ) {
    frameworks.push("STAR Method: Situation, Task, Action, Result")
  }

  // Technical questions
  if (
    interviewType === "technical" ||
    questionLower.includes("how would you") ||
    questionLower.includes("design") ||
    questionLower.includes("implement")
  ) {
    frameworks.push(
      "Technical Approach: Problem → Solution → Trade-offs → Implementation"
    )
  }

  // Leadership questions
  if (
    questionLower.includes("leadership") ||
    questionLower.includes("team") ||
    questionLower.includes("conflict")
  ) {
    frameworks.push(
      "Leadership Framework: Challenge → Action → Impact → Learning"
    )
  }

  return frameworks
}
