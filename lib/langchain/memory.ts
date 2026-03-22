/**
 * LangChain Memory Implementation
 * Handles conversation history and context management
 */

import { RedisChatMessageHistory } from "@langchain/community/stores/message/ioredis"
import { ChatOpenAI } from "@langchain/openai"
import { ConversationSummaryBufferMemory } from "langchain/memory"

import { RAG_CONFIG } from "@/config/rag"

import { db } from "../db"
import redis from "../redis"

export const memoryLlm = new ChatOpenAI({
  modelName: RAG_CONFIG.models.memory.model,
  temperature: RAG_CONFIG.models.memory.temperature,
})

/**
 * Create a buffer memory instance with Redis persistence
 */
export function createBufferMemory(
  sessionId: string,
  sessionTTL: number = 86400
) {
  return new ConversationSummaryBufferMemory({
    chatHistory: new RedisChatMessageHistory({
      sessionId,
      sessionTTL,
      client: redis,
    }),
    memoryKey: "chat_history",
    returnMessages: true,
    llm: memoryLlm,
    maxTokenLimit: 1000,
  })
}

/**
 * Retrieve conversation history from database
 */
export async function loadConversationHistory(
  userId: string,
  conversationId: string
) {
  try {
    const messages = await db.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    })

    const formattedHistory: { input: string; output: string }[] = []
    for (let i = 0; i < messages.length; i += 2) {
      const userMessage = messages[i]
      const assistantMessage = messages[i + 1]
      if (userMessage && assistantMessage) {
        formattedHistory.push({
          input: userMessage.content,
          output: assistantMessage.content,
        })
      }
    }
    return formattedHistory
  } catch (error) {
    console.error("Error loading conversation history:", error)
    return []
  }
}

/**
 * Create a memory instance with pre-loaded history
 */
export async function createMemoryWithHistory(
  userId: string,
  conversationId: string
) {
  const memory = createBufferMemory(conversationId)
  const memoryVariables = await memory.loadMemoryVariables({})
  const existingMessages = memoryVariables.chat_history || []

  if (existingMessages.length === 0) {
    try {
      const history = await loadConversationHistory(userId, conversationId)
      for (const { input, output } of history) {
        await memory.saveContext({ input }, { output })
      }
    } catch (error) {
      console.error("Error populating memory:", error)
    }
  }

  return memory
}

/**
 * Load conversation history as a plain messages array for the Responses API.
 * Checks Redis first (hot path), falls back to Postgres.
 */
export async function loadMessagesForResponsesAPI(
  userId: string,
  conversationId: string
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  try {
    const history = new RedisChatMessageHistory({
      sessionId: conversationId,
      sessionTTL: 86400,
      client: redis,
    })
    const redisMessages = await history.getMessages()
    if (redisMessages.length > 0) {
      return redisMessages.map((msg) => ({
        role: msg._getType() === "human" ? "user" : "assistant",
        content:
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
      })) as Array<{ role: "user" | "assistant"; content: string }>
    }
  } catch (error) {
    console.error("Error loading from Redis, falling back to DB:", error)
  }

  const dbMessages = await db.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  })

  return dbMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
}

/**
 * Append a new user/assistant exchange to Redis history.
 */
export async function appendToRedisHistory(
  conversationId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  try {
    const history = new RedisChatMessageHistory({
      sessionId: conversationId,
      sessionTTL: 86400,
      client: redis,
    })
    await history.addUserMessage(userMessage)
    await history.addAIChatMessage(assistantMessage)
  } catch (error) {
    console.error("Error appending to Redis history:", error)
  }
}

/**
 * Save chat interaction to database
 */
export async function saveChatInteraction(
  userId: string,
  conversationId: string,
  input: string,
  output: string,
  sources?: any[]
) {
  try {
    await db.chatMessage.create({
      data: {
        conversationId,
        role: "user",
        content: input,
      },
    })

    const assistantMessage = await db.chatMessage.create({
      data: {
        conversationId,
        role: "assistant",
        content: output,
        sources: sources || [],
      },
    })

    await db.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    return assistantMessage
  } catch (error) {
    console.error("Error saving chat interaction:", error)
    return null
  }
}
