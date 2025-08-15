import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";



import { db } from "@/lib/db";
import { saveChatInteraction } from "@/lib/langchain/memory";
import { executeRAGPipeline } from "@/lib/langchain/rag-pipeline";
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
          title: conversationTitle,
          documentIds: selectedDocuments || [],
        },
      })
      conversationId = conversation.id
    }

    // Execute the RAG pipeline
    const result = await executeRAGPipeline(message, user.id, conversationId, {
      documentIds: selectedDocuments,
      modelName: options?.modelName,
      temperature: options?.temperature,
    })

    // Save the interaction in the database
    const assistantMessage = await saveChatInteraction(
      user.id,
      conversationId,
      message,
      result.response,
      result.sources
    )

    // Return response
    return NextResponse.json(assistantMessage)
  } catch (error) {
    console.error("Error in RAG endpoint:", error)

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
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}