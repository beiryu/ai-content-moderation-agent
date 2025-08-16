/**
 * LangChain Memory Implementation
 * Handles conversation history and context management
 */

import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import { BufferMemory } from "langchain/memory";



import { db } from "../db";
import redis from "../redis";



/**
 * Create a buffer memory instance with Redis persistence
 */
export function createBufferMemory(
  sessionId: string,
  sessionTTL: number = 86400
) {
  return new BufferMemory({
    chatHistory: new UpstashRedisChatMessageHistory({
      sessionId,
      sessionTTL,
      client: redis,
    }),
    memoryKey: "chat_history",
    returnMessages: true,
  })
}

// We're no longer using summary memory as requested

/**
 * Retrieve conversation history from database
 */
export async function loadConversationHistory(
  userId: string,
  conversationId: string
) {
  try {
    // Fetch messages from the database
    const messages = await db.chatMessage.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Format messages for memory
    const formattedHistory: { input: string; output: string }[] = []

    // Process messages in pairs (user -> assistant)
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
  // Create memory instance with Redis persistence
  const memory = createBufferMemory(conversationId)

  // First check if we have existing messages in Redis
  const memoryVariables = await memory.loadMemoryVariables({})
  const existingMessages = memoryVariables.chat_history || []

  // If Redis memory is empty, load from database and populate Redis
  if (existingMessages.length === 0) {
    try {
      const history = await loadConversationHistory(userId, conversationId)

      // Populate Redis with database history
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
    // Save user message
    await db.chatMessage.create({
      data: {
        conversationId,
        role: "user",
        content: input,
      },
    })

    // Save assistant message with sources if available
    const assistantMessage = await db.chatMessage.create({
      data: {
        conversationId,
        role: "assistant",
        content: output,
        sources: sources || [],
      },
    })

    // Update conversation timestamp
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