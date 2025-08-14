import { RAG_CONFIG } from "./config"

/**
 * RAG System Utilities
 * Helper functions for the RAG system
 */

/**
 * Validate environment configuration for RAG system
 */
export function validateRAGConfiguration(): {
  isValid: boolean
  missingVars: string[]
  warnings: string[]
} {
  const required = ["OPENAI_API_KEY", "PINECONE_API_KEY", "DATABASE_URL"]

  const optional = [
    "PINECONE_INDEX_NAME",
    "PINECONE_NAMESPACE",
    "OPENAI_BASE_URL",
  ]

  const missingVars: string[] = []
  const warnings: string[] = []

  // Check required variables
  required.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName)
    }
  })

  // Check optional variables and warn if missing
  optional.forEach((varName) => {
    if (!process.env[varName]) {
      warnings.push(
        `Optional environment variable ${varName} not set. Using default value.`
      )
    }
  })

  return {
    isValid: missingVars.length === 0,
    missingVars,
    warnings,
  }
}

/**
 * Calculate optimal chunk size based on content type
 */
export function calculateOptimalChunkSize(
  contentType: "resume" | "job_description" | "portfolio" | "notes",
  contentLength: number
): number {
  const baseSizes = {
    resume: 800,
    job_description: 600,
    portfolio: 1200,
    notes: 500,
  }

  const baseSize = baseSizes[contentType] || RAG_CONFIG.chunking.chunkSize

  // Adjust based on content length
  if (contentLength < 2000) {
    return Math.min(baseSize, contentLength / 2)
  } else if (contentLength > 10000) {
    return Math.min(baseSize * 1.5, 1500)
  }

  return baseSize
}

/**
 * Generate unique document ID
 */
export function generateDocumentId(
  userId: string,
  documentType: string,
  title?: string
): string {
  const timestamp = Date.now()
  const titleSlug = title
    ? `-${title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`
    : ""
  return `${userId}-${documentType}-${timestamp}${titleSlug}`
}

/**
 * Extract keywords from text for metadata
 */
export function extractKeywords(
  text: string,
  maxKeywords: number = 10
): string[] {
  // Simple keyword extraction - in production, you might use more sophisticated NLP
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .filter((word) => !isStopWord(word))

  // Count word frequency
  const wordCount: Record<string, number> = {}
  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1
  })

  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word)
}

/**
 * Check if a word is a stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "up",
    "about",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "among",
    "through",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "can",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "my",
    "your",
    "his",
    "her",
    "its",
    "our",
    "their",
  ])

  return stopWords.has(word.toLowerCase())
}

/**
 * Format memory content for display
 */
export function formatMemoryContent(
  content: string,
  maxLength: number = 150
): string {
  if (content.length <= maxLength) {
    return content
  }

  const truncated = content.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(" ")

  return lastSpace > maxLength * 0.8
    ? truncated.substring(0, lastSpace) + "..."
    : truncated + "..."
}

/**
 * Calculate memory importance decay based on age
 */
export function calculateImportanceDecay(
  originalImportance: number,
  ageInDays: number,
  memoryType: "short_term" | "long_term" = "short_term"
): number {
  const decayRates = {
    short_term: 0.1, // 10% decay per day
    long_term: 0.01, // 1% decay per day
  }

  const decayRate = decayRates[memoryType]
  const decayFactor = Math.exp(-decayRate * ageInDays)

  return Math.max(originalImportance * decayFactor, 0.1) // Minimum importance of 0.1
}

/**
 * Performance monitoring utilities
 */
export class RAGPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)

    // Keep only last 100 measurements
    const values = this.metrics.get(name)!
    if (values.length > 100) {
      values.shift()
    }
  }

  getAverageMetric(name: string): number {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return 0

    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  getMetricSummary(): Record<
    string,
    { avg: number; min: number; max: number; count: number }
  > {
    const summary: Record<string, any> = {}

    this.metrics.forEach((values, name) => {
      if (values.length > 0) {
        summary[name] = {
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
        }
      }
    })

    return summary
  }
}

// Singleton performance monitor
export const performanceMonitor = new RAGPerformanceMonitor()
