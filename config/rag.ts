/**
 * RAG Configuration
 * Centralized configuration for the RAG system
 *
 * Note: This configuration is used by both the legacy RAG implementation
 * and the new LangChain-based implementation.
 */

export const RAG_CONFIG = {
  // Embedding Configuration
  embedding: {
    model: "text-embedding-3-large",
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
    chunkSize: 256,
    chunkOverlap: 20,
    // separators: ["\n\n", "\n", ".", "!", "?", ",", " ", ""] as string[],
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
    similarityThreshold: 0.35, // Lowered from 0.7 to match typical scores
    maxResults: 10,
    hybridSearchWeight: 0.6, // Reduced vector search weight from 0.7 to 0.6 (keyword is now 0.4)
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
