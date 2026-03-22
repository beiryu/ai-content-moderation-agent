/**
 * Shared OpenAI model settings for chat completion streaming and LangChain memory.
 * Document RAG uses OpenAI vector stores / file_search — not the fields here.
 */

export const RAG_CONFIG = {
  models: {
    chat: {
      model: "gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 2000,
      presencePenalty: 0.1,
      frequencyPenalty: 0.2,
    },
    memory: {
      model: "gpt-3.5-turbo",
      temperature: 0,
    },
  },
} as const

export type RAGConfig = typeof RAG_CONFIG
