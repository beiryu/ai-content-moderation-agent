import { analyzeQuery } from "../analyzers/query-analyzer"
import {
  findRelevantMemories,
  storeLongTermMemory,
  updateMemoryImportance,
  type LongTermMemory,
} from "./long-term"
import {
  getAllSessionMemories,
  getRecentMemories,
  searchSessionMemories,
  storeMemoryEntry,
  type MemoryEntry,
} from "./short-term"

/**
 * Memory Orchestrator
 * Coordinates between short-term and long-term memory systems
 */

interface InteractionMemory {
  query: string
  response: string
  sources?: Array<{
    documentId: string
    score: number
  }>
}

/**
 * Store an interaction in memory
 */
export async function storeInteraction(
  userId: string,
  sessionId: string,
  query: string,
  response: string,
  sources?: Array<{
    documentId: string
    score: number
  }>
): Promise<void> {
  try {
    // Store user message in short-term memory
    await storeMemoryEntry(userId, sessionId, "user", query)

    // Store assistant response in short-term memory
    await storeMemoryEntry(userId, sessionId, "assistant", response, {
      sources,
    })

    // Analyze if this interaction contains important insights for long-term memory
    const shouldStore = await shouldStoreInLongTerm(query, response)

    if (shouldStore) {
      // Calculate importance score
      const importance = calculateImportance(query, response)

      // Determine the appropriate category
      const category = determineMemoryCategory(query)

      // Create a summary for long-term storage
      const summary = await createMemorySummary({
        query,
        response,
        sources,
      })

      // Store in long-term memory
      await storeLongTermMemory(userId, category, summary, importance, {
        originalQuery: query,
        sources,
      })
    }
  } catch (error) {
    console.error("Error storing interaction:", error)
  }
}

/**
 * Get conversation context from memory for a query
 */
export async function getContextualMemories(
  userId: string,
  sessionId: string
): Promise<MemoryEntry[]> {
  try {
    // Get recent conversation history from short-term memory
    const recentMemories = await getRecentMemories(userId, sessionId, 10)

    return recentMemories
  } catch (error) {
    console.error("Error getting contextual memories:", error)
    return []
  }
}

/**
 * Get personalized context based on user's long-term memory
 */
export async function getPersonalizedContext(
  userId: string,
  query: string
): Promise<string[]> {
  try {
    // Analyze the query
    const analysis = await analyzeQuery(query)

    // Find relevant memories based on query
    const relevantMemories = await findRelevantMemories(userId, query, 0.7, 3)

    // Extract and format memory content
    return relevantMemories.map((memory) => memory.content)
  } catch (error) {
    console.error("Error getting personalized context:", error)
    return []
  }
}

/**
 * Store a memory directly in long-term storage
 */
export async function storeMemory(
  userId: string,
  category: string,
  content: string,
  importance: number = 0.5,
  metadata?: Record<string, any>
): Promise<string> {
  try {
    return await storeLongTermMemory(
      userId,
      category,
      content,
      importance,
      metadata
    )
  } catch (error) {
    console.error("Error storing memory:", error)
    throw error
  }
}

/**
 * Store session insights at the end of a session
 */
export async function storeSessionInsights(
  userId: string,
  sessionId: string
): Promise<void> {
  try {
    // Get all messages from this session
    const allMessages = await getAllSessionMemories(userId, sessionId)

    if (allMessages.length < 2) {
      return // Not enough messages to generate insights
    }

    // Extract all queries and responses
    const userMessages = allMessages.filter((msg) => msg.role === "user")
    const assistantMessages = allMessages.filter(
      (msg) => msg.role === "assistant"
    )

    // Generate a session summary
    const sessionSummary = `Session contained ${
      userMessages.length
    } questions mainly about ${identifyMainTopics(userMessages)}.`

    // Store the summary in long-term memory
    await storeLongTermMemory(userId, "session_summary", sessionSummary, 0.6, {
      sessionId,
      messageCount: allMessages.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error storing session insights:", error)
  }
}

/**
 * Determine if an interaction should be stored in long-term memory
 */
async function shouldStoreInLongTerm(
  query: string,
  response: string
): Promise<boolean> {
  // Implement logic to determine if this is important enough to store
  // Could be based on:
  // - Query complexity (length, structure)
  // - Response length or complexity
  // - Presence of specific keywords
  // - If it contains a definition or important concept

  // For now, we'll use a simple heuristic
  const isQueryComplex = query.length > 100
  const isResponseDetailed = response.length > 300
  const containsKeyIndicator =
    query.includes("remember") ||
    query.includes("important") ||
    query.includes("key concept")

  return isQueryComplex || isResponseDetailed || containsKeyIndicator
}

/**
 * Calculate importance score for memory
 */
function calculateImportance(query: string, response: string): number {
  // Base importance
  let importance = 0.5

  // Adjust based on query characteristics
  if (query.includes("remember") || query.includes("important")) {
    importance += 0.2
  }

  // Adjust based on query length (complex queries might be more important)
  if (query.length > 150) {
    importance += 0.1
  }

  // Adjust based on response length (detailed responses might be more important)
  if (response.length > 500) {
    importance += 0.1
  }

  // Cap at 1.0
  return Math.min(importance, 1.0)
}

/**
 * Determine category for memory storage
 */
function determineMemoryCategory(query: string): string {
  // Simplified category detection
  const normalizedQuery = query.toLowerCase()

  if (normalizedQuery.includes("resume") || normalizedQuery.includes("cv")) {
    return "resume"
  }

  if (
    normalizedQuery.includes("job") ||
    normalizedQuery.includes("position") ||
    normalizedQuery.includes("career")
  ) {
    return "job_search"
  }

  if (
    normalizedQuery.includes("skill") ||
    normalizedQuery.includes("ability")
  ) {
    return "skills"
  }

  if (
    normalizedQuery.includes("project") ||
    normalizedQuery.includes("portfolio")
  ) {
    return "projects"
  }

  if (
    normalizedQuery.includes("interview") ||
    normalizedQuery.includes("question")
  ) {
    return "interviews"
  }

  // Default category
  return "general"
}

/**
 * Create a summary for long-term memory storage
 */
async function createMemorySummary(
  interaction: InteractionMemory
): Promise<string> {
  // In a full implementation, this could use an LLM to summarize
  // For now, we'll create a simple summary

  // Truncate response for summary
  const truncatedResponse =
    interaction.response.length > 100
      ? interaction.response.substring(0, 100) + "..."
      : interaction.response

  return `Q: ${interaction.query}\nA: ${truncatedResponse}`
}

/**
 * Identify main topics from user messages
 */
function identifyMainTopics(messages: MemoryEntry[]): string {
  // Extract all content
  const content = messages.map((msg) => msg.content).join(" ")

  // Simplified topic extraction
  // Count common keywords
  const keywords = [
    "resume",
    "job",
    "interview",
    "skill",
    "project",
    "experience",
    "education",
    "career",
    "position",
    "company",
  ]

  const counts = keywords.reduce((acc, keyword) => {
    const regex = new RegExp(keyword, "gi")
    const count = (content.match(regex) || []).length
    if (count > 0) {
      acc[keyword] = count
    }
    return acc
  }, {} as Record<string, number>)

  // Sort by count
  const sortedTopics = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic)
    .slice(0, 3)

  return sortedTopics.join(", ") || "various topics"
}
