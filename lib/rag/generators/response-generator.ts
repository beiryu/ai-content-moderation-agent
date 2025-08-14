import { OpenAI } from "openai"

import { QueryAnalysis } from "@/lib/rag/analyzers/query-analyzer"
import { ContextResponse, RetrievedDocument } from "@/lib/rag/context-builder"

/**
 * Response Generator
 * Generates responses based on context, query, and user preferences
 */

// Load OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ResponseOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  includeCitations?: boolean
  citationFormat?: "inline" | "footnotes" | "endnotes"
  tonePreference?: "professional" | "conversational" | "technical" | "simple"
}

export interface GeneratedResponse {
  content: string
  sources: Array<{
    documentId: string
    documentTitle: string
    chunkContent: string
    relevanceScore: number
  }>
  model: string
  tokenCount: {
    prompt: number
    completion: number
    total: number
  }
}

/**
 * Generate a response based on context, query, and options
 */
export async function generateResponse(
  query: string,
  queryAnalysis: QueryAnalysis,
  context: ContextResponse,
  retrievedDocuments: RetrievedDocument[],
  options: ResponseOptions = {}
): Promise<GeneratedResponse> {
  // Default options
  const {
    model = "gpt-3.5-turbo",
    temperature = 0.7,
    maxTokens = 1000,
    includeCitations = true,
    citationFormat = "inline",
    tonePreference = "professional",
  } = options

  try {
    // Build the prompt for the LLM
    const prompt = buildPrompt(
      query,
      queryAnalysis,
      context,
      includeCitations,
      citationFormat,
      tonePreference
    )

    // Generate completion
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
    })

    // Extract the generated text
    const responseContent =
      completion.choices[0]?.message.content ||
      "I couldn't generate a response. Please try again."

    // Format sources for the response
    const responseSources = formatSourcesForResponse(retrievedDocuments)

    // Return the generated response
    return {
      content: responseContent,
      sources: responseSources,
      model,
      tokenCount: {
        prompt: completion.usage?.prompt_tokens || 0,
        completion: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0,
      },
    }
  } catch (error) {
    console.error("Error generating response:", error)

    // Return a fallback response
    return {
      content:
        "I'm having trouble generating a response right now. Please try again later.",
      sources: [],
      model,
      tokenCount: {
        prompt: 0,
        completion: 0,
        total: 0,
      },
    }
  }
}

/**
 * Build the prompt for the LLM
 */
function buildPrompt(
  query: string,
  queryAnalysis: QueryAnalysis,
  context: ContextResponse,
  includeCitations: boolean,
  citationFormat: "inline" | "footnotes" | "endnotes",
  tonePreference: "professional" | "conversational" | "technical" | "simple"
): string {
  // Add system instructions
  let prompt = `You are a helpful AI assistant that answers questions based on the user's documents.
Always base your responses on the provided document context.
If the information is not in the documents, acknowledge this limitation politely.

USER QUERY: ${query}

QUERY INTENT: ${queryAnalysis.intent}

CONTEXT:
${context.formattedContext}
`

  // Add citation instructions if needed
  if (includeCitations) {
    prompt += `
CITATION INSTRUCTIONS:
When referencing information from the documents, include citations in ${citationFormat} format.
For inline citations, use the format [Document Title] after the referenced information.
For footnotes, use superscript numbers¹ and list the sources at the end.
For endnotes, use [1], [2], etc., and list the sources at the end.
`
  }

  // Add tone instructions
  prompt += `
TONE INSTRUCTIONS:
Please respond in a ${tonePreference} tone.
`

  // Final instruction
  prompt += `
Based on the context provided, answer the user's query thoroughly and accurately.
`

  return prompt
}

/**
 * Format sources for the response
 */
function formatSourcesForResponse(documents: RetrievedDocument[]): Array<{
  documentId: string
  documentTitle: string
  chunkContent: string
  relevanceScore: number
}> {
  // Deduplicate documents by ID and return top 5 most relevant
  const uniqueDocs = new Map<
    string,
    {
      documentId: string
      documentTitle: string
      chunkContent: string
      relevanceScore: number
    }
  >()

  for (const doc of documents) {
    const key = doc.documentId

    if (
      !uniqueDocs.has(key) ||
      doc.relevanceScore > uniqueDocs.get(key)!.relevanceScore
    ) {
      uniqueDocs.set(key, {
        documentId: doc.documentId,
        documentTitle: doc.documentTitle,
        chunkContent:
          doc.content.length > 150
            ? doc.content.substring(0, 150) + "..."
            : doc.content,
        relevanceScore: doc.relevanceScore,
      })
    }
  }

  // Convert to array and sort by relevance
  return Array.from(uniqueDocs.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5)
}
