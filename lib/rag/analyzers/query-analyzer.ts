// Types for query analysis
export interface QueryAnalysis {
  intent: QueryIntent
  entities: string[]
  keyPhrases: string[]
  searchParams: {
    keyTerms: string[]
    filters: {
      documentTypes?: string[]
      dateRange?: {
        start?: Date
        end?: Date
      }
    }
    sortBy?: "relevance" | "date" | "documentType"
  }
}

// Possible query intents
export type QueryIntent =
  | "FACTUAL_QUERY" // Looking for specific facts or information
  | "CONCEPTUAL_QUERY" // Understanding concepts or ideas
  | "COMPARISON_QUERY" // Comparing multiple items or concepts
  | "PROCEDURAL_QUERY" // How to do something
  | "EXAMPLE_REQUEST" // Request for examples
  | "DEFINITION_QUERY" // What does X mean
  | "OPINION_QUERY" // Looking for opinions or evaluations
  | "CLARIFICATION_QUERY" // Follow-up for clarification
  | "UNKNOWN" // Can't determine the intent

/**
 * Analyze a user query to extract intent, entities, key phrases, and search parameters
 */
export async function analyzeQuery(
  query: string,
): Promise<QueryAnalysis> {
  try {
    // For simple implementation, we'll detect intent based on patterns
    const intent = detectQueryIntent(query)

    // Extract entities and key phrases
    const entities = extractEntities(query)
    const keyPhrases = extractKeyPhrases(query)

    // Generate search parameters
    const searchParams = generateSearchParameters(query, intent)

    return {
      intent,
      entities,
      keyPhrases,
      searchParams,
    }
  } catch (error) {
    console.error("Error analyzing query:", error)
    return {
      intent: "UNKNOWN",
      entities: [],
      keyPhrases: [],
      searchParams: {
        keyTerms: [],
        filters: {},
      },
    }
  }
}

/**
 * Detect the intent of a user query
 */
function detectQueryIntent(query: string): QueryIntent {
  const normalizedQuery = query.toLowerCase()

  // Simple pattern matching for intent detection
  if (
    normalizedQuery.match(/^(what is|who is|when was|where is|why is|how many)/)
  ) {
    return "FACTUAL_QUERY"
  }

  if (
    normalizedQuery.match(/^(explain|describe|elaborate|understand|concept of)/)
  ) {
    return "CONCEPTUAL_QUERY"
  }

  if (
    normalizedQuery.match(
      /(compare|versus|vs\.?|difference between|similarities? between)/
    )
  ) {
    return "COMPARISON_QUERY"
  }

  if (
    normalizedQuery.match(
      /(how to|steps to|process for|procedure for|guide for)/
    )
  ) {
    return "PROCEDURAL_QUERY"
  }

  if (normalizedQuery.match(/(example|instance|sample|case of|illustration)/)) {
    return "EXAMPLE_REQUEST"
  }

  if (
    normalizedQuery.match(/(define|definition|meaning of|what does .* mean)/)
  ) {
    return "DEFINITION_QUERY"
  }

  if (
    normalizedQuery.match(
      /(do you think|your opinion|what's better|recommend|suggest)/
    )
  ) {
    return "OPINION_QUERY"
  }

  if (
    normalizedQuery.match(
      /(can you clarify|what do you mean|to be clear|you mentioned|earlier you said)/
    )
  ) {
    return "CLARIFICATION_QUERY"
  }

  return "UNKNOWN"
}

/**
 * Extract entities from a query
 */
function extractEntities(query: string): string[] {
  // Basic entity extraction
  // In a production system, this would use NER (Named Entity Recognition)
  const words = query.split(/\s+/)

  // Look for capitalized words that might be entities
  const potentialEntities = words.filter(
    (word) =>
      /^[A-Z][a-z]+$/.test(word) &&
      !["I", "A", "The", "What", "Who", "When", "Where", "Why", "How"].includes(
        word
      )
  )

  return [...new Set(potentialEntities)]
}

/**
 * Extract key phrases from a query
 */
function extractKeyPhrases(query: string): string[] {
  // Simple key phrase extraction
  // Remove common stop words
  const stopWords = [
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
    "with",
    "by",
  ]

  const words = query.toLowerCase().split(/\s+/)
  const filteredWords = words.filter((word) => !stopWords.includes(word))

  // Find phrases (consecutive meaningful words)
  const keyPhrases: string[] = []
  let currentPhrase: string[] = []

  filteredWords.forEach((word) => {
    if (word.length > 2) {
      currentPhrase.push(word)
    } else if (currentPhrase.length > 0) {
      if (currentPhrase.length > 1) {
        keyPhrases.push(currentPhrase.join(" "))
      }
      currentPhrase = []
    }
  })

  // Add the last phrase if it exists
  if (currentPhrase.length > 1) {
    keyPhrases.push(currentPhrase.join(" "))
  }

  // Add individual important words
  filteredWords
    .filter((word) => word.length > 3)
    .forEach((word) => {
      if (!keyPhrases.some((phrase) => phrase.includes(word))) {
        keyPhrases.push(word)
      }
    })

  return keyPhrases
}

/**
 * Generate search parameters based on the query and intent
 */
function generateSearchParameters(
  query: string,
  intent: QueryIntent
): QueryAnalysis["searchParams"] {
  const normalizedQuery = query.toLowerCase()
  const keyTerms: string[] = []
  const filters: QueryAnalysis["searchParams"]["filters"] = {}

  // Extract key terms based on intent
  switch (intent) {
    case "FACTUAL_QUERY":
      // For factual queries, focus on nouns and specific terms
      keyTerms.push(...extractKeyNouns(normalizedQuery))
      break

    case "CONCEPTUAL_QUERY":
      // For conceptual queries, include broader terms
      keyTerms.push(...extractConceptTerms(normalizedQuery))
      break

    case "COMPARISON_QUERY":
      // For comparison, identify the items being compared
      keyTerms.push(...extractComparisonItems(normalizedQuery))
      break

    default:
      // Default extraction for other intent types
      keyTerms.push(
        ...normalizedQuery
          .split(/\s+/)
          .filter(
            (word) =>
              word.length > 3 &&
              !/^(what|when|where|why|how|is|are|was|were|do|does|did)$/.test(
                word
              )
          )
      )
  }

  // Detect document type filters
  if (normalizedQuery.includes("resume") || normalizedQuery.includes("cv")) {
    filters.documentTypes = [...(filters.documentTypes || []), "RESUME"]
  }

  if (
    normalizedQuery.includes("job description") ||
    normalizedQuery.includes("job posting")
  ) {
    filters.documentTypes = [
      ...(filters.documentTypes || []),
      "JOB_DESCRIPTION",
    ]
  }

  if (
    normalizedQuery.includes("portfolio") ||
    normalizedQuery.includes("project")
  ) {
    filters.documentTypes = [...(filters.documentTypes || []), "PORTFOLIO"]
  }

  if (normalizedQuery.includes("note") || normalizedQuery.includes("notes")) {
    filters.documentTypes = [...(filters.documentTypes || []), "NOTES"]
  }

  return {
    keyTerms: [...new Set(keyTerms)],
    filters,
    sortBy: determineSortCriteria(query, intent),
  }
}

/**
 * Extract key nouns from a query
 */
function extractKeyNouns(query: string): string[] {
  // Simple noun extraction - in a real system, use POS tagging
  const words = query.split(/\s+/)
  return words.filter(
    (word) =>
      word.length > 3 &&
      !/^(what|when|where|why|how|is|are|was|were|do|does|did|a|an|the|this|that|these|those)$/i.test(
        word
      )
  )
}

/**
 * Extract concept-related terms
 */
function extractConceptTerms(query: string): string[] {
  const concepts: string[] = []
  // Look for phrases after "explain" or "describe"
  const match = query.match(
    /(?:explain|describe|elaborate on|tell me about)\s+(.+?)(?:\s+to me|\?|$)/i
  )
  if (match && match[1]) {
    concepts.push(match[1])
  }

  return concepts.length > 0 ? concepts : extractKeyNouns(query)
}

/**
 * Extract items being compared
 */
function extractComparisonItems(query: string): string[] {
  const items: string[] = []
  // Look for "X vs Y" or "comparison between X and Y" patterns
  const vsMatch = query.match(/(.+?)\s+(?:vs\.?|versus)\s+(.+?)(?:\?|$)/i)
  if (vsMatch) {
    items.push(vsMatch[1], vsMatch[2])
    return items
  }

  const comparisonMatch = query.match(
    /(?:compare|comparison between|difference between)\s+(.+?)\s+and\s+(.+?)(?:\?|$)/i
  )
  if (comparisonMatch) {
    items.push(comparisonMatch[1], comparisonMatch[2])
    return items
  }

  return extractKeyNouns(query)
}

/**
 * Determine sort criteria based on query and intent
 */
function determineSortCriteria(
  query: string,
  intent: QueryIntent
): "relevance" | "date" | "documentType" {
  const normalizedQuery = query.toLowerCase()

  if (
    normalizedQuery.includes("recent") ||
    normalizedQuery.includes("latest") ||
    normalizedQuery.includes("newest")
  ) {
    return "date"
  }

  if (
    normalizedQuery.includes("document type") ||
    normalizedQuery.includes("category")
  ) {
    return "documentType"
  }

  return "relevance"
}
