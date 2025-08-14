import { db } from "@/lib/db"
import { RAG_CONFIG } from "@/lib/rag/config"
import { stringToEmbedding } from "@/lib/rag/embedding"

/**
 * Long-term memory for persistent insights and patterns
 * Stores important memories, insights, and preferences across sessions
 */

export interface LongTermMemory {
  id: string
  userId: string
  category: string
  content: string
  embedding?: number[]
  importance: number
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

/**
 * Store a new long-term memory
 */
export async function storeLongTermMemory(
  userId: string,
  category: string,
  content: string,
  importance: number = 0.5,
  metadata?: Record<string, any>
): Promise<string> {
  try {
    // Generate embedding for the memory
    const embedding = await stringToEmbedding(content)
    const embeddingString = embedding.join(",")

    // Store in database
    const memory = await db.longTermMemory.create({
      data: {
        userId,
        category,
        content,
        embedding: embeddingString,
        importance,
        metadata: metadata || {},
      },
    })

    // Prune memories if we have too many
    await pruneLongTermMemories(userId)

    return memory.id
  } catch (error) {
    console.error("Error storing long-term memory:", error)
    throw error
  }
}

/**
 * Retrieve all long-term memories for a user
 */
export async function getAllLongTermMemories(
  userId: string
): Promise<LongTermMemory[]> {
  try {
    const memories = await db.longTermMemory.findMany({
      where: {
        userId,
      },
      orderBy: {
        importance: "desc",
      },
    })

    return memories.map((memory) => ({
      id: memory.id,
      userId: memory.userId,
      category: memory.category,
      content: memory.content,
      embedding: memory.embedding
        ? memory.embedding.split(",").map(Number)
        : undefined,
      importance: memory.importance,
      metadata: memory.metadata as Record<string, any>,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
    }))
  } catch (error) {
    console.error("Error retrieving long-term memories:", error)
    return []
  }
}

/**
 * Retrieve long-term memories by category
 */
export async function getLongTermMemoriesByCategory(
  userId: string,
  category: string
): Promise<LongTermMemory[]> {
  try {
    const memories = await db.longTermMemory.findMany({
      where: {
        userId,
        category,
      },
      orderBy: {
        importance: "desc",
      },
    })

    return memories.map((memory) => ({
      id: memory.id,
      userId: memory.userId,
      category: memory.category,
      content: memory.content,
      embedding: memory.embedding
        ? memory.embedding.split(",").map(Number)
        : undefined,
      importance: memory.importance,
      metadata: memory.metadata as Record<string, any>,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
    }))
  } catch (error) {
    console.error("Error retrieving long-term memories by category:", error)
    return []
  }
}

/**
 * Find relevant long-term memories for a query
 */
export async function findRelevantMemories(
  userId: string,
  query: string,
  threshold: number = 0.7,
  limit: number = 5
): Promise<LongTermMemory[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await stringToEmbedding(query)

    // Get all memories for the user
    const allMemories = await getAllLongTermMemories(userId)

    // Calculate similarity for each memory
    const memoriesWithSimilarity = allMemories
      .filter((memory) => memory.embedding)
      .map((memory) => {
        const similarity = calculateCosineSimilarity(
          queryEmbedding,
          memory.embedding!
        )
        return { ...memory, similarity }
      })

    // Filter by threshold and sort by similarity
    return memoriesWithSimilarity
      .filter((memory) => memory.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  } catch (error) {
    console.error("Error finding relevant memories:", error)
    return []
  }
}

/**
 * Update the importance of a memory
 */
export async function updateMemoryImportance(
  memoryId: string,
  importance: number
): Promise<void> {
  try {
    await db.longTermMemory.update({
      where: {
        id: memoryId,
      },
      data: {
        importance,
      },
    })
  } catch (error) {
    console.error("Error updating memory importance:", error)
  }
}

/**
 * Prune long-term memories if there are too many
 */
async function pruneLongTermMemories(userId: string): Promise<void> {
  try {
    // Count memories
    const count = await db.longTermMemory.count({
      where: {
        userId,
      },
    })

    // If we have too many memories, delete the least important ones
    if (count > RAG_CONFIG.memory.maxLongTermEntries) {
      // Get IDs of least important memories to delete
      const memoriesToDelete = await db.longTermMemory.findMany({
        where: {
          userId,
        },
        orderBy: {
          importance: "asc",
        },
        take: count - RAG_CONFIG.memory.maxLongTermEntries,
        select: {
          id: true,
        },
      })

      // Delete the memories
      await db.longTermMemory.deleteMany({
        where: {
          id: {
            in: memoriesToDelete.map((memory) => memory.id),
          },
        },
      })
    }
  } catch (error) {
    console.error("Error pruning long-term memories:", error)
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must be of same length")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
