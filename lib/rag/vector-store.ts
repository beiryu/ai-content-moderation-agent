import { Pinecone } from "@pinecone-database/pinecone"

import { RAG_CONFIG } from "./config"
import { embedText } from "./embedding"

/**
 * Vector Store Service
 * Handles interactions with Pinecone vector database
 */

// Initialize Pinecone client once at module load time
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
})

// Initialize the index reference
const index = pinecone.index(RAG_CONFIG.vectorDb.indexName)
console.log("Vector store initialized at module load")

/**
 * Flatten nested metadata objects for Pinecone compatibility
 */
function flattenMetadata(metadata: Record<string, any>): Record<string, any> {
  const flattened: Record<string, any> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) {
      continue
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      // Flatten nested objects with dot notation
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (nestedValue !== null && nestedValue !== undefined) {
          const flatKey = `${key}.${nestedKey}`
          if (typeof nestedValue === "object" && !Array.isArray(nestedValue)) {
            // Handle deeply nested objects
            const deepFlattened = flattenMetadata({ [flatKey]: nestedValue })
            Object.assign(flattened, deepFlattened)
          } else {
            flattened[flatKey] = nestedValue
          }
        }
      }
    } else if (Array.isArray(value)) {
      // Convert arrays to comma-separated strings if they contain primitives
      const stringArray = value
        .filter((v) => v !== null && v !== undefined)
        .map(String)
      if (stringArray.length > 0) {
        flattened[key] = stringArray
      }
    } else {
      flattened[key] = value
    }
  }

  return flattened
}

/**
 * Upsert vectors to Pinecone
 */
export async function upsertVectors(
  vectors: Array<{
    id: string
    values: number[]
    metadata: Record<string, any>
  }>
): Promise<void> {
  try {
    // Flatten metadata for Pinecone compatibility
    const processedVectors = vectors.map((vector) => ({
      ...vector,
      metadata: flattenMetadata(vector.metadata),
    }))

    await index
      .namespace(RAG_CONFIG.vectorDb.namespace)
      .upsert(processedVectors)
  } catch (error) {
    console.error("Error upserting vectors:", error)
    throw new Error("Failed to upsert vectors")
  }
}

/**
 * Search for similar vectors
 */
export async function searchSimilar(
  queryVector: number[],
  topK: number = RAG_CONFIG.vectorDb.topK,
  filter?: Record<string, any>
): Promise<any[]> {
  try {
    const queryRequest = {
      vector: queryVector,
      topK,
      includeMetadata: RAG_CONFIG.vectorDb.includeMetadata,
      ...(filter && { filter }),
    }

    const response = await index
      .namespace(RAG_CONFIG.vectorDb.namespace)
      .query(queryRequest)

    return response.matches || []
  } catch (error) {
    console.error("Error searching vectors:", error)
    throw new Error("Failed to search vectors")
  }
}

/**
 * Search for similar content by text query
 */
export async function searchByText(
  query: string,
  topK: number = RAG_CONFIG.vectorDb.topK,
  filter?: Record<string, any>
): Promise<any[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await embedText(query)

    // Search for similar vectors
    return await searchSimilar(queryEmbedding, topK, filter)
  } catch (error) {
    console.error("Error searching by text:", error)
    throw new Error("Failed to search by text")
  }
}

/**
 * Delete vectors by IDs
 */
export async function deleteVectors(ids: string[]): Promise<void> {
  try {
    await index.namespace(RAG_CONFIG.vectorDb.namespace).deleteMany(ids)
  } catch (error) {
    console.error("Error deleting vectors:", error)
    throw new Error("Failed to delete vectors")
  }
}

/**
 * Delete all vectors for a specific user
 */
export async function deleteUserVectors(userId: string): Promise<void> {
  try {
    await index.namespace(RAG_CONFIG.vectorDb.namespace).deleteMany({
      userId: { $eq: userId },
    })
  } catch (error) {
    console.error("Error deleting user vectors:", error)
    throw new Error("Failed to delete user vectors")
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats(): Promise<any> {
  try {
    return await index.describeIndexStats()
  } catch (error) {
    console.error("Error getting index stats:", error)
    throw new Error("Failed to get index stats")
  }
}
