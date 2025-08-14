/**
 * LangChain Pinecone Vector Store Integration
 * Handles interactions with Pinecone through LangChain's interface
 */

import { Document } from "@langchain/core/documents"
import { PineconeStore } from "@langchain/pinecone"
import { Pinecone } from "@pinecone-database/pinecone"

import { RAG_CONFIG } from "../../config/rag"
import { getEmbeddingModel } from "./embedding"

// Initialize Pinecone client
let pineconeClient: Pinecone | null = null
let pineconeStore: PineconeStore | null = null

/**
 * Initialize Pinecone client
 */
async function initPinecone(): Promise<Pinecone> {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || "",
    })
  }
  return pineconeClient
}

/**
 * Get or create Pinecone vector store instance
 */
export async function getPineconeStore(): Promise<PineconeStore> {
  if (!pineconeStore) {
    const client = await initPinecone()
    const pineconeIndex = client.Index(RAG_CONFIG.vectorDb.indexName)

    pineconeStore = await PineconeStore.fromExistingIndex(getEmbeddingModel(), {
      pineconeIndex,
      namespace: RAG_CONFIG.vectorDb.namespace,
      textKey: "content",
    })
  }
  return pineconeStore
}

/**
 * Add documents to Pinecone vector store
 */
export async function addDocumentsToPinecone(
  documents: Document[],
  options?: {
    namespace?: string
    ids?: string[]
  }
): Promise<string[]> {
  try {
    const store = await getPineconeStore()

    // Use custom namespace if provided, otherwise use default
    const namespace = options?.namespace || RAG_CONFIG.vectorDb.namespace

    // Add documents to vector store
    const ids = await store.addDocuments(documents, {
      ids: options?.ids,
      namespace,
    })

    return ids
  } catch (error) {
    console.error("Error adding documents to Pinecone:", error)
    throw new Error(`Failed to add documents to Pinecone: ${error}`)
  }
}

/**
 * Delete documents from Pinecone
 */
export async function deleteDocumentsFromPinecone(
  ids: string[],
  namespace?: string
): Promise<void> {
  try {
    const store = await getPineconeStore()
    await store.delete({
      ids,
      namespace: namespace || RAG_CONFIG.vectorDb.namespace,
    })
  } catch (error) {
    console.error("Error deleting documents from Pinecone:", error)
    throw new Error(`Failed to delete documents from Pinecone: ${error}`)
  }
}

/**
 * Search for similar documents in Pinecone
 */
export async function searchSimilarDocuments(
  query: string,
  options?: {
    k?: number
    filter?: Record<string, any>
    namespace?: string
  }
): Promise<Document[]> {
  try {
    const store = await getPineconeStore()

    const { k = RAG_CONFIG.vectorDb.topK, filter, namespace } = options || {}

    console.log("Vector Search - Query:", query.substring(0, 50) + "...")
    console.log("Vector Search - Filter:", JSON.stringify(filter, null, 2))
    console.log("Vector Search - Top K:", k)

    // Search for similar documents
    const results = await store.similaritySearch(query, k, filter)

    console.log("Vector Search - Results count:", results.length)
    if (results.length > 0) {
      console.log(
        "Vector Search - Document IDs found:",
        results.map((doc) => doc.metadata.documentId || "unknown")
      )
    } else {
      console.log("Vector Search - No documents found matching criteria")
    }

    return results
  } catch (error) {
    console.error("Error searching for similar documents:", error)
    throw new Error(`Failed to search for similar documents: ${error}`)
  }
}

/**
 * Search with raw embedding vector
 */
export async function searchWithEmbedding(
  embedding: number[],
  options?: {
    k?: number
    filter?: Record<string, any>
    namespace?: string
  }
): Promise<Document[]> {
  try {
    const store = await getPineconeStore()

    const { k = RAG_CONFIG.vectorDb.topK, filter, namespace } = options || {}

    // Search by vector
    const results = await store.similaritySearchVectorWithScore(
      embedding,
      k,
      filter
    )

    // Extract just the documents
    return results.map(([doc, _score]) => doc)
  } catch (error) {
    console.error("Error searching with embedding:", error)
    throw new Error(`Failed to search with embedding: ${error}`)
  }
}
