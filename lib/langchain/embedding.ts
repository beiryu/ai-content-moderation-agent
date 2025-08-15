/**
 * LangChain Embedding Service
 * Handles document embedding using OpenAI embeddings
 */

import { Document } from "@langchain/core/documents"
import { OpenAIEmbeddings } from "@langchain/openai"

import { RAG_CONFIG } from "../../config/rag"

// Create a singleton embedding instance to reuse across calls
let embeddingModel: OpenAIEmbeddings | null = null

/**
 * Get or create OpenAI embedding model instance
 */
export function getEmbeddingModel(): OpenAIEmbeddings {
  if (!embeddingModel) {
    embeddingModel = new OpenAIEmbeddings({
      modelName: RAG_CONFIG.models.embedding.model,
      dimensions: RAG_CONFIG.models.embedding.dimensions,
      batchSize: RAG_CONFIG.models.embedding.batchSize,
    })
  }
  return embeddingModel
}

/**
 * Embed a single text string
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const embeddings = await getEmbeddingModel().embedQuery(text)
    return embeddings
  } catch (error) {
    console.error("Error embedding text:", error)
    throw new Error(`Failed to embed text: ${error}`)
  }
}

/**
 * Embed multiple documents in batch
 */
export async function embedDocuments(
  documents: Document[]
): Promise<Document[]> {
  try {
    // Extract the text content from all documents
    const texts = documents.map((doc) => doc.pageContent)

    // Get embeddings for all texts in batch
    const embeddings = await getEmbeddingModel().embedDocuments(texts)

    // Return documents with embeddings added to metadata
    return documents.map((doc, i) => {
      return {
        ...doc,
        metadata: {
          ...doc.metadata,
          embedding: embeddings[i],
        },
      }
    })
  } catch (error) {
    console.error("Error embedding documents:", error)
    throw new Error(`Failed to embed documents: ${error}`)
  }
}

/**
 * Convert embedding vector to string for storage
 */
export function embeddingToString(embedding: number[]): string {
  return JSON.stringify(embedding)
}

/**
 * Parse embedding string back to vector
 */
export function stringToEmbedding(embeddingString: string): number[] {
  return JSON.parse(embeddingString)
}
