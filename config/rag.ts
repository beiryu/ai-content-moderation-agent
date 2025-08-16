/**
 * RAG Configuration
 * Centralized configuration for the RAG system
 *
 * Note: This configuration is used by both the legacy RAG implementation
 * and the new LangChain-based implementation.
 */

import { env } from "@/env.mjs"

export const RAG_CONFIG = {
  // Model Configuration
  models: {
    chat: {
      default: "gpt-4o-mini",
      interview: "gpt-3.5-turbo-1106",
      analysis: "gpt-3.5-turbo-1106",
      temperature: 0.2,
      streaming: false,
      maxTokens: 2000,
      presencePenalty: 0.1,
      frequencyPenalty: 0.2,
    },
    embedding: {
      model: "text-embedding-3-large",
      dimensions: 1536,
      batchSize: 100,
    },
    memory: {
      model: "gpt-3.5-turbo",
      temperature: 0,
    },
  },

  // Vector Database Configuration
  vectorDb: {
    indexName: env.PINECONE_INDEX_NAME || "interview-assistant",
    namespace: env.PINECONE_NAMESPACE || "default",
    topK: 5,
    includeMetadata: true,
    textKey: "content",
  },

  // Chunking Configuration
  chunking: {
    chunkSize: 256,
    chunkOverlap: 20,
    separators: ["\n\n", "\n", ".", "!", "?", ",", " ", ""] as string[],
  },

  // System Prompts
  prompts: {
    ragSystem: `You are a helpful AI assistant. Use the following context to answer the user's question. 
      If you don't know the answer, say that you don't know. DO NOT make up an answer.
      
      Context:
      {context}`,
    interviewAnalysis: `You are an interview analysis assistant. Analyze the given text and:
      1. Determine if it's a question and its type (technical/behavioral/general)
      2. Extract the core question
      3. Provide 2-3 suggested responses
      4. Identify key topics/keywords
      
      Format response as JSON with fields:
      {
        "question": "extracted question",
        "questionType": "technical" | "behavioral" | "general" | "other",
        "suggestedAnswerPoints": ["suggestion1", "suggestion2"],
        "keywords": ["keyword1", "keyword2"],
      }
      
      Keep responses professional and concise.`,
  },
} as const

export type RAGConfig = typeof RAG_CONFIG
