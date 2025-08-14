import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { executeRAGPipeline } from "@/lib/langchain/rag-pipeline";
import { saveChatInteraction } from "@/lib/langchain/memory";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

// Define request schema
const LangChainRAGRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  selectedDocuments: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
  options: z
    .object({
      includeCitations: z.boolean().optional(),
      tonePreference: z.enum(["professional", "conversational", "technical"]).optional(),
      modelName: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { message, selectedDocuments, sessionId, options } =
      LangChainRAGRequestSchema.parse(body);

    // Create or retrieve the chat conversation
    let conversationId = sessionId;

    // If no conversation ID was provided, create a new one
    if (!conversationId) {
      // Create a title from the first message, truncating if too long
      const conversationTitle =
        message.length > 100 ? `${message.substring(0, 100)}...` : message;

      const conversation = await db.chatConversation.create({
        data: {
          userId: user.id,
          title: conversationTitle,
          documentIds: selectedDocuments || [],
        },
      });
      conversationId = conversation.id;
    }

    // Execute the RAG pipeline
    const result = await executeRAGPipeline(message, user.id, conversationId, {
      documentIds: selectedDocuments,
      modelName: options?.modelName,
      temperature: options?.temperature,
    });

    // Save the interaction in the database
    await saveChatInteraction(
      user.id,
      conversationId,
      message,
      result.response,
      result.sources
    );

    // Update the conversation's updatedAt timestamp
    await db.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Return response
    return NextResponse.json({
      id: conversationId,
      conversationId,
      role: "assistant",
      content: result.response,
      sources: result.sources || [],
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Error in LangChain RAG endpoint:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to process chat request",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}