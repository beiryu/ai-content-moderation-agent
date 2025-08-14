/**
 * LangChain Memory Implementation
 * Handles conversation history and context management
 */

import { OpenAI } from "@langchain/openai"
import { BufferMemory, ConversationSummaryMemory } from "langchain/memory"

import { db } from "../db"

/**
 * Create a buffer memory instance for short conversations
 */
export function createBufferMemory(sessionId: string) {
  return new BufferMemory({
    memoryKey: "chat_history",
    inputKey: "input",
    outputKey: "output",
    returnMessages: true,
  })
}

/**
 * Create a summary memory instance for longer conversations
 */
export function createSummaryMemory(sessionId: string) {
  const llm = new OpenAI({
    modelName: "gpt-3.5-turbo-instruct",
    temperature: 0,
  })

  return new ConversationSummaryMemory({
    memoryKey: "chat_history",
    llm,
    inputKey: "input",
    outputKey: "output",
    returnMessages: true,
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
  conversationId: string,
  useBufferMemory = true
) {
  // Create memory instance
  const memory = useBufferMemory
    ? createBufferMemory(conversationId)
    : createSummaryMemory(conversationId)

  // Load conversation history
  const history = await loadConversationHistory(userId, conversationId)

  // Populate memory with history
  for (const { input, output } of history) {
    await memory.saveContext({ input }, { output })
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
    await db.chatMessage.create({
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

    return true
  } catch (error) {
    console.error("Error saving chat interaction:", error)
    return false
  }
}
