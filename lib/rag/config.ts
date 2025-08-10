/**
 * RAG Configuration
 * Centralized configuration for the RAG system
 */

export const RAG_CONFIG = {
  // Embedding Configuration
  embedding: {
    model: "text-embedding-3-small",
    dimensions: 1536,
    batchSize: 100,
  },

  // Vector Database Configuration
  vectorDb: {
    indexName: process.env.PINECONE_INDEX_NAME || "interview-assistant",
    namespace: process.env.PINECONE_NAMESPACE || "default",
    topK: 5,
    includeMetadata: true,
  },

  // Chunking Configuration
  chunking: {
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", ".", "!", "?", ",", " ", ""] as string[],
  },

  // Memory Configuration
  memory: {
    shortTermRetentionDays: 7,
    longTermRetentionMonths: 12,
    maxShortTermEntries: 100,
    maxLongTermEntries: 1000,
  },

  // Search Configuration
  search: {
    similarityThreshold: 0.7,
    maxResults: 10,
    hybridSearchWeight: 0.7, // Weight for vector search vs keyword search
  },

  // Tools Configuration
  tools: {
    webSearchEnabled: true,
    codeAnalysisEnabled: true,
    cvScannerEnabled: true,
    jobDescriptionParserEnabled: true,
  },

  // Performance Configuration
  performance: {
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour in seconds
    requestTimeout: 30000, // 30 seconds
    maxConcurrentRequests: 5,
  },
} as const

export type RAGConfig = typeof RAG_CONFIG
