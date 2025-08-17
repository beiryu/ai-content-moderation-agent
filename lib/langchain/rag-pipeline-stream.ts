/**
 * LangChain RAG Pipeline - Streaming Version
 * Implements streaming Retrieval Augmented Generation using LangChain's streaming capabilities
 */

import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import { ChatOpenAI } from "@langchain/openai"
import { formatDocumentsAsString } from "langchain/util/document"

import { RAG_CONFIG } from "../../config/rag"
import { createMemoryWithHistory } from "./memory"
import { searchSimilarDocuments } from "./vector-store"

/**
 * Create the streaming LLM instance
 */
export const streamingLlm = new ChatOpenAI({
  modelName: RAG_CONFIG.models.chat.default,
  temperature: RAG_CONFIG.models.chat.temperature,
  streaming: RAG_CONFIG.models.chat.streaming, // Enable streaming
})

/**
 * Create the RAG prompt template (same as non-streaming)
 */
export const ragPromptTemplate = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(RAG_CONFIG.prompts.ragSystem),
  new MessagesPlaceholder("chat_history"),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
])

/**
 * Create a streaming RAG chain with memory and retrieve relevant documents
 */
export async function createStreamingRAGChain(
  userId: string,
  conversationId: string,
  query: string,
  options?: {
    documentIds?: string[]
  }
) {
  // Create memory with Redis persistence
  const memory = await createMemoryWithHistory(userId, conversationId)

  // Create filter based on user ID and optional document IDs
  const filter: Record<string, any> = {
    userId: { $eq: userId },
  }

  // If document IDs are provided, filter by those specific documents
  if (options?.documentIds && options.documentIds.length > 0) {
    filter["documentId"] = { $in: options.documentIds }
    console.log(
      "Streaming RAG Pipeline - Using document filter:",
      options.documentIds
    )
  }

  console.log("Streaming RAG Pipeline - Full filter:", filter)

  // Retrieve relevant documents with combined filter
  const retrievedDocs = await searchSimilarDocuments(query, {
    // Increase k if we have multiple documents to ensure we get enough context from each
    k:
      options?.documentIds && options.documentIds.length > 1
        ? Math.min(RAG_CONFIG.vectorDb.topK * options.documentIds.length, 20)
        : RAG_CONFIG.vectorDb.topK,
    filter: filter,
  })

  // Create the streaming RAG chain
  const chain = RunnableSequence.from([
    {
      input: (q) => q,
      chat_history: async () => {
        const memoryVariables = await memory.loadMemoryVariables({})
        return memoryVariables.chat_history || []
      },
      context: () => formatDocumentsAsString(retrievedDocs),
    },
    ragPromptTemplate,
    streamingLlm, // Use streaming LLM
  ])

  return {
    chain,
    memory,
    retrievedDocs,
  }
}

/**
 * Execute the streaming RAG pipeline with a query
 */
export async function executeRAGPipelineStream(
  query: string,
  userId: string,
  conversationId: string,
  options?: {
    documentIds?: string[]
  }
) {
  try {
    console.log("Starting streaming RAG pipeline for query:", query)

    // Create chain with integrated document retrieval
    const { chain, memory, retrievedDocs } = await createStreamingRAGChain(
      userId,
      conversationId,
      query,
      options
    )

    // Format sources from the retrieved documents for client response
    const sources = retrievedDocs.map((doc) => ({
      documentId: doc.metadata.documentId,
      documentTitle: doc.metadata.documentTitle || "Unnamed Document",
      content: doc.pageContent.substring(0, 100) + "...",
      score: doc.metadata.score,
      chunkId: doc.metadata.chunkId,
    }))

    console.log("Retrieved documents for streaming:", sources.length)

    // Stream the response
    const stream = await chain.stream(query)

    let fullResponse = ""

    // Create an async generator that yields chunks with content and sources
    async function* processStream() {
      // First yield sources
      yield {
        content: null,
        sources: sources,
      }

      // Then yield content chunks
      for await (const chunk of stream) {
        console.log("Received chunk from LLM:", chunk)

        // Handle LangChain AIMessageChunk properly
        let content = ""
        if (typeof chunk === "string") {
          content = chunk
        } else if (chunk && typeof chunk === "object" && "content" in chunk) {
          // Handle AIMessageChunk - content can be string or complex
          const chunkContent = chunk.content
          if (typeof chunkContent === "string") {
            content = chunkContent
          } else if (Array.isArray(chunkContent)) {
            // Handle complex content by extracting text parts
            content = chunkContent
              .filter((part: any) => part.type === "text")
              .map((part: any) => part.text)
              .join("")
          }
        }

        if (content) {
          fullResponse += content
          yield {
            content: content,
            sources: null,
          }
        }
      }

      // Save conversation after streaming is complete
      try {
        await memory.saveContext({ input: query }, { output: fullResponse })
        console.log(
          "Saved conversation to memory, full response length:",
          fullResponse.length
        )
      } catch (error) {
        console.error("Error saving conversation to memory:", error)
      }
    }

    return processStream()
  } catch (error) {
    console.error("Error executing streaming RAG pipeline:", error)
    throw new Error(`Failed to execute streaming RAG pipeline: ${error}`)
  }
}
