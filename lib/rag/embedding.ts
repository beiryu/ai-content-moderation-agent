import { OpenAIEmbeddings } from "@langchain/openai"

import { RAG_CONFIG } from "./config"

/**
 * Embedding Service
 * Handles text embeddings for the RAG system
 */

// Initialize embeddings client once at module load time
const embeddingClient = new OpenAIEmbeddings({
  model: RAG_CONFIG.embedding.model,
  dimensions: RAG_CONFIG.embedding.dimensions,
  openAIApiKey: process.env.OPENAI_API_KEY,
})

/**
 * Generate embeddings for a single text
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const embedding = await embeddingClient.embedQuery(text)
    return embedding
  } catch (error) {
    console.error("Error generating embedding:", error)
    throw new Error("Failed to generate embedding")
  }
}

/**
 * Generate embeddings for multiple texts in batches
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  try {
    const embeddings = await embeddingClient.embedDocuments(texts)
    return embeddings
  } catch (error) {
    console.error("Error generating embeddings:", error)
    throw new Error("Failed to generate embeddings")
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same length")
  }

  const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0))

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dotProduct / (magnitudeA * magnitudeB)
}

/**
 * Convert embedding to base64 string for storage
 */
export function embeddingToString(embedding: number[]): string {
  return Buffer.from(new Float32Array(embedding).buffer).toString("base64")
}

/**
 * Convert base64 string back to embedding
 */
export async function stringToEmbedding(text: string): Promise<number[]> {
  // If input is already an embedding string in base64 format, convert it back
  if (text.match(/^[A-Za-z0-9+/=]+$/)) {
    try {
      const buffer = Buffer.from(text, "base64")
      const embedding = Array.from(new Float32Array(buffer.buffer))

      // Check if the embedding has the correct dimension, if not, generate a new one
      if (embedding.length === RAG_CONFIG.embedding.dimensions) {
        return embedding
      }
    } catch (error) {
      console.warn("Invalid embedding string, generating new embedding instead")
    }
  }

  // Generate a new embedding if the input is text or the stored embedding is invalid
  return await embedText(text)
}
