import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"
import { analyzeQuery } from "@/lib/rag/analyzers/query-analyzer"
import { buildResponseContext } from "@/lib/rag/context-builder"
import { generateResponse } from "@/lib/rag/generators/response-generator"
import {
  getContextualMemories,
  getPersonalizedContext,
  storeInteraction,
} from "@/lib/rag/memory/orchestrator"
import { retrieveRelevantContent } from "@/lib/rag/retrieval"
import { getCurrentUser } from "@/lib/session"
import { RagChatRequestSchema } from "@/lib/validations/chat-message"

export async function POST(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await req.json()
    const { message, selectedDocuments, sessionId, options } =
      RagChatRequestSchema.parse(body)

    // Create or retrieve the chat conversation
    let conversationId = sessionId

    // If no conversation ID was provided, create a new one
    if (!conversationId) {
      // Create a title from the first message, truncating if too long
      const conversationTitle =
        message.length > 100 ? `${message.substring(0, 100)}...` : message

      const conversation = await db.chatConversation.create({
        data: {
          userId: user.id,
          title: conversationTitle, // Use first message as the title
          documentIds: selectedDocuments,
        },
      })
      conversationId = conversation.id
    }

    // Use the conversation ID for the chat session ID
    let chatSessionId = conversationId

    // Step 1: Analyze the query to understand intent and extract entities
    const queryAnalysis = await analyzeQuery(message)

    // Step 2: Get conversation context from memory
    const conversationMemories = await getContextualMemories(
      user.id,
      chatSessionId
    )

    // Step 3: Get personalized long-term memories
    const personalizedContext = await getPersonalizedContext(user.id, message)

    // Step 4: Retrieve relevant content from selected documents
    const relevantContent = await retrieveRelevantContent(message, user.id, {
      documentIds: selectedDocuments,
      maxResults: 7,
      similarityThreshold: 0.35, // Lowered threshold to match lower scores
      sessionId: chatSessionId,
    })

    // Map to the required format for context builder
    const retrievedDocuments = relevantContent.map((content) => ({
      content: content.content,
      documentId: content.metadata.documentId,
      documentTitle: content.metadata.documentTitle,
      documentType: content.metadata.documentType,
      relevanceScore: content.score,
    }))

    // Step 5: Build context for response generation
    const context = await buildResponseContext(
      message,
      queryAnalysis,
      retrievedDocuments,
      conversationMemories,
      [], // No long-term memories yet (would come from personalizedContext)
      {
        maxContextLength: 4000,
        includeSourceMetadata: true,
        prioritizeRecency: true,
      }
    )

    // Step 6: Generate response
    const response = await generateResponse(
      message,
      queryAnalysis,
      context,
      retrievedDocuments,
      {
        includeCitations: options?.includeCitations ?? true,
        tonePreference: options?.tonePreference ?? "professional",
      }
    )

    // Step 7: Store the interaction in memory
    await storeInteraction(
      user.id,
      chatSessionId,
      message,
      response.content,
      relevantContent.map((doc) => ({
        documentId: doc.metadata.documentId,
        score: doc.score,
      }))
    )

    // Also store the messages in the database
    // First the user message
    await db.chatMessage.create({
      data: {
        conversationId,
        role: "user",
        content: message,
      },
    })

    // Then the assistant message
    const assistantMessage = await db.chatMessage.create({
      data: {
        conversationId,
        role: "assistant",
        content: response.content,
        sources: response.sources,
      },
    })

    // Update the conversation's updatedAt timestamp
    await db.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    // Step 8: Return response with document sources
    return NextResponse.json(assistantMessage)
  } catch (error) {
    console.error("Error in chat endpoint:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: "Failed to process chat request",
      },
      { status: 500 }
    )
  }
}
