import { db } from "@/lib/db"
import { generateChatResponse } from "@/lib/rag/generators/chat-response"
import { retrieveRelevantContent } from "@/lib/rag/retrieval"

export interface ChatRequest {
  userId: string
  message: string
  selectedDocuments: string[]
  conversationId?: string
}

export interface ChatResponse {
  id: string
  content: string
  sources: Array<{
    documentId: string
    documentTitle: string
    chunkContent: string
    relevanceScore: number
  }>
  conversationId: string
  timestamp: Date
}

/**
 * Process a chat request with documents
 */
export async function chatWithDocuments({
  userId,
  message,
  selectedDocuments,
  conversationId,
}: ChatRequest): Promise<ChatResponse> {
  try {
    // 1. Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await db.chatConversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 10, // Get recent context
          },
        },
      })

      if (!conversation) {
        throw new Error("Conversation not found")
      }
    } else {
      // Create new conversation
      conversation = await db.chatConversation.create({
        data: {
          userId,
          title: generateConversationTitle(message),
          documentIds: selectedDocuments,
        },
        include: {
          messages: true,
        },
      })
    }

    // 2. Store user message
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    })

    // 3. Retrieve relevant content from selected documents
    // First, get document content for selected documents
    const documents = await db.document.findMany({
      where: {
        id: { in: selectedDocuments },
        userId,
      },
      include: {
        chunks: {
          select: {
            content: true,
            metadata: true,
          },
        },
      },
    })

    // 4. Retrieve relevant content using existing RAG system
    const relevantContent = await retrieveRelevantContent(message, userId, {
      maxResults: 10,
    })

    // 5. Prepare conversation context
    const conversationContext = conversation.messages.reverse().map((msg) => ({
      role: msg.role.toLowerCase(),
      content: msg.content,
    }))

    // 6. Generate response
    const responseContent = await generateChatResponse({
      query: message,
      relevantContent,
      conversationContext,
      selectedDocuments,
    })

    // 7. Extract sources from relevant content
    const sources = relevantContent.map((result) => ({
      documentId: result.source,
      documentTitle: result.metadata?.documentTitle || "Unknown Document",
      chunkContent: result.content,
      relevanceScore: result.score || 0,
    }))

    // 8. Store assistant response
    const assistantMessage = await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: responseContent,
        sources: sources,
        // metadata: {
        //   relevantChunks: relevantContent.length,
        //   averageScore: relevantContent.reduce((sum, r) => sum + r.score, 0) / relevantContent.length,
        // },
      },
    })

    // 9. Update conversation timestamp
    await db.chatConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    })

    return {
      id: assistantMessage.id,
      content: responseContent,
      sources,
      conversationId: conversation.id,
      timestamp: assistantMessage.createdAt,
    }
  } catch (error) {
    console.error("Error processing chat request:", error)
    throw new Error("Failed to process chat request")
  }
}

/**
 * Generate a conversation title from the first message
 */
function generateConversationTitle(message: string): string {
  // Take first 50 characters and add ellipsis if longer
  const title = message.length > 50 ? `${message.substring(0, 50)}...` : message
  return title
}

/**
 * Classify query intent (for future enhancement)
 */
export function classifyQueryIntent(query: string): {
  intent: "question" | "summarization" | "comparison" | "extraction"
  confidence: number
} {
  const lowercaseQuery = query.toLowerCase()

  // Simple rule-based classification (can be enhanced with ML)
  if (
    lowercaseQuery.includes("summarize") ||
    lowercaseQuery.includes("summary")
  ) {
    return { intent: "summarization", confidence: 0.8 }
  }

  if (
    lowercaseQuery.includes("compare") ||
    lowercaseQuery.includes("difference")
  ) {
    return { intent: "comparison", confidence: 0.8 }
  }

  if (lowercaseQuery.includes("extract") || lowercaseQuery.includes("find")) {
    return { intent: "extraction", confidence: 0.7 }
  }

  return { intent: "question", confidence: 0.6 }
}
