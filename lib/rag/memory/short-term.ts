import { db } from "@/lib/db"
import { RAG_CONFIG } from "@/lib/rag/config"

/**
 * Short-term memory for chat sessions
 * Stores recent messages and context for the current session
 */

export interface MemoryEntry {
  id: string
  userId: string
  sessionId: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  metadata?: {
    sources?: Array<{
      documentId: string
      score: number
    }>
    importance?: number
    [key: string]: any
  }
}

/**
 * Store a new memory entry in the short-term memory
 */
export async function storeMemoryEntry(
  userId: string,
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: MemoryEntry["metadata"]
): Promise<string> {
  try {
    // Store in database
    const entry = await db.sessionMemory.create({
      data: {
        userId,
        sessionId,
        role,
        content,
        metadata: metadata || {},
      },
    })

    // If we have too many entries, prune the oldest ones
    await pruneMemory(userId, sessionId)

    return entry.id
  } catch (error) {
    console.error("Error storing memory entry:", error)
    throw error
  }
}

/**
 * Retrieve recent memory entries for a session
 */
export async function getRecentMemories(
  userId: string,
  sessionId: string,
  limit: number = 10
): Promise<MemoryEntry[]> {
  try {
    const entries = await db.sessionMemory.findMany({
      where: {
        userId,
        sessionId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    })

    // Convert to MemoryEntry format and reverse to get chronological order
    return entries
      .map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        sessionId: entry.sessionId,
        role: entry.role as "user" | "assistant",
        content: entry.content,
        timestamp: entry.createdAt,
        metadata: entry.metadata as MemoryEntry["metadata"],
      }))
      .reverse()
  } catch (error) {
    console.error("Error retrieving recent memories:", error)
    return []
  }
}

/**
 * Retrieve all memory entries for a session
 */
export async function getAllSessionMemories(
  userId: string,
  sessionId: string
): Promise<MemoryEntry[]> {
  try {
    const entries = await db.sessionMemory.findMany({
      where: {
        userId,
        sessionId,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Convert to MemoryEntry format
    return entries.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      sessionId: entry.sessionId,
      role: entry.role as "user" | "assistant",
      content: entry.content,
      timestamp: entry.createdAt,
      metadata: entry.metadata as MemoryEntry["metadata"],
    }))
  } catch (error) {
    console.error("Error retrieving all session memories:", error)
    return []
  }
}

/**
 * Prune memory entries if there are too many
 */
async function pruneMemory(userId: string, sessionId: string): Promise<void> {
  try {
    // Count entries
    const count = await db.sessionMemory.count({
      where: {
        userId,
        sessionId,
      },
    })

    // If we have too many entries, delete the oldest ones
    if (count > RAG_CONFIG.memory.maxShortTermEntries) {
      // Get IDs of oldest entries to delete
      const entriesToDelete = await db.sessionMemory.findMany({
        where: {
          userId,
          sessionId,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: count - RAG_CONFIG.memory.maxShortTermEntries,
        select: {
          id: true,
        },
      })

      // Delete the entries
      await db.sessionMemory.deleteMany({
        where: {
          id: {
            in: entriesToDelete.map((entry) => entry.id),
          },
        },
      })
    }
  } catch (error) {
    console.error("Error pruning memory:", error)
  }
}

/**
 * Delete all session memories
 */
export async function clearSessionMemories(
  userId: string,
  sessionId: string
): Promise<void> {
  try {
    await db.sessionMemory.deleteMany({
      where: {
        userId,
        sessionId,
      },
    })
  } catch (error) {
    console.error("Error clearing session memories:", error)
  }
}

/**
 * Search for relevant memories in the session
 */
export async function searchSessionMemories(
  userId: string,
  sessionId: string,
  query: string
): Promise<MemoryEntry[]> {
  try {
    // In a real implementation, this would use semantic search
    // For now, we'll just do a simple text search
    const entries = await db.sessionMemory.findMany({
      where: {
        userId,
        sessionId,
        content: {
          contains: query,
          mode: "insensitive",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return entries.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      sessionId: entry.sessionId,
      role: entry.role as "user" | "assistant",
      content: entry.content,
      timestamp: entry.createdAt,
      metadata: entry.metadata as MemoryEntry["metadata"],
    }))
  } catch (error) {
    console.error("Error searching session memories:", error)
    return []
  }
}
