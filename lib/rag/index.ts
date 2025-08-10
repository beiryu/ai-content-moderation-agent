export { longTermMemory, shortTermMemory } from "./memory"

export {
  processDocument,
  processDocumentContent,
  getUserKnowledgeBaseSummary,
} from "./system"

export {
  RAGPerformanceMonitor,
  calculateImportanceDecay,
  calculateOptimalChunkSize,
  extractKeywords,
  formatMemoryContent,
  generateDocumentId,
  performanceMonitor,
  validateRAGConfiguration,
} from "./utils"

// Configuration
export { RAG_CONFIG } from "./config"

// Type definitions (re-exported for convenience)
export type { RAGConfig } from "./config"
