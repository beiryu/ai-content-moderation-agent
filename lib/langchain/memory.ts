/**
 * LangChain Memory Implementation
 * Handles conversation history and context management
 */

import { ChatOpenAI } from "@langchain/openai"
import { ConversationSummaryBufferMemory } from "langchain/memory"

import { RAG_CONFIG } from "@/config/rag"

import { db } from "../db"

export const memoryLlm = new ChatOpenAI({
  modelName: RAG_CONFIG.models.memory.model,
  temperature: RAG_CONFIG.models.memory.temperature,
})

/**
 * Create a buffer memory instance (in-memory, no Redis)
 */
export function createBufferMemory(_sessionId: string) {
  return new ConversationSummaryBufferMemory({
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
  try {
    const history = await loadConversationHistory(userId, conversationId)
    for (const { input, output } of history) {
      await memory.saveContext({ input }, { output })
    }
  } catch (error) {
    console.error("Error populating memory:", error)
  }
  return memory
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
