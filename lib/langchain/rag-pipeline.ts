/**
 * LangChain RAG Pipeline
 * Implements a complete Retrieval Augmented Generation pipeline using LangChain
 */

import { Document } from "@langchain/core/documents"
import { StringOutputParser } from "@langchain/core/output_parsers"
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
import { getPineconeStore, searchSimilarDocuments } from "./vector-store"

/**
 * Create the LLM instance
 */
export const llm = new ChatOpenAI({
  modelName: RAG_CONFIG.models.chat.default,
  temperature: RAG_CONFIG.models.chat.temperature,
  streaming: RAG_CONFIG.models.chat.streaming,
})

/**
 * Create the RAG prompt template
 */
export const ragPromptTemplate = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(RAG_CONFIG.prompts.ragSystem),
  new MessagesPlaceholder("chat_history"),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
])

/**
 * Create a RAG chain with memory
 */
export async function createRAGChain(
  userId: string,
  conversationId: string,
  options?: {
    documentIds?: string[]
  }
) {
  // Create memory with Redis persistence
  const memory = await createMemoryWithHistory(userId, conversationId)

  // Create the prompt template
  const promptTemplate = ragPromptTemplate

  // Create the RAG chain
  const chain = RunnableSequence.from([
    {
      input: (query) => query,
      chat_history: async () => {
        const memoryVariables = await memory.loadMemoryVariables({})
        return memoryVariables.chat_history || []
      },
      context: async (query) => {
        // Create filter based on user ID and optional document IDs
        const filter: Record<string, any> = {
          userId: { $eq: userId },
        }

        // If document IDs are provided, filter by those specific documents
        if (options?.documentIds && options.documentIds.length > 0) {
          filter["documentId"] = { $in: options.documentIds }
          console.log(
            "RAG Pipeline - Using document filter:",
            options.documentIds
          )
        }

        console.log("RAG Pipeline - Full filter:", filter)

        // Retrieve relevant documents with combined filter
        const docs = await searchSimilarDocuments(query, {
          // Increase k if we have multiple documents to ensure we get enough context from each
          k:
            options?.documentIds && options.documentIds.length > 1
              ? Math.min(
                  RAG_CONFIG.vectorDb.topK * options.documentIds.length,
                  20
                )
              : RAG_CONFIG.vectorDb.topK,
          filter: filter,
        })

        return formatDocumentsAsString(docs)
      },
    },
    promptTemplate,
    llm,
    new StringOutputParser(),
  ])

  return {
    chain,
    memory,
  }
}

/**
 * Execute the RAG pipeline with a query
 */
export async function executeRAGPipeline(
  query: string,
  userId: string,
  conversationId: string,
  options?: {
    documentIds?: string[]
  }
) {
  try {
    const { chain, memory } = await createRAGChain(
      userId,
      conversationId,
      options
    )

    // Execute the chain
    const response = await chain.invoke(query)

    // Save to memory
    await memory.saveContext({ input: query }, { output: response })

    return {
      response,
      sources: [], // Would need to modify to track sources
    }
  } catch (error) {
    console.error("Error executing RAG pipeline:", error)
    throw new Error(`Failed to execute RAG pipeline: ${error}`)
  }
}

/**
 * Process a document through the complete pipeline (split, embed, store)
 */
export async function processDocumentRAG(
  document: Document,
  userId: string,
  options?: {
    namespace?: string
    documentId?: string
  }
) {
  try {
    // Add userId and ensure all required metadata is present
    const documentWithUserId = {
      ...document,
      metadata: {
        ...document.metadata,
        userId,
        documentId: options?.documentId || document.metadata.documentId,
        // Ensure we have document title/name for better identification in search results
        documentTitle:
          document.metadata.documentTitle ||
          document.metadata.title ||
          "Unnamed Document",
        // Add chunk identifier for better tracking
        chunkId:
          document.metadata.chunkId ||
          `chunk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      },
    }

    // Get the vector store
    const store = await getPineconeStore()

    // Add document to vector store
    await store.addDocuments([documentWithUserId], {
      namespace: options?.namespace || RAG_CONFIG.vectorDb.namespace,
    })

    return true
  } catch (error) {
    console.error("Error processing document through RAG pipeline:", error)
    throw new Error(`Failed to process document through RAG pipeline: ${error}`)
  }
}
