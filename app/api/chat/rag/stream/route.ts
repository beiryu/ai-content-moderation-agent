import { NextRequest } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"
import { saveChatInteraction } from "@/lib/langchain/memory"
import { executeRAGPipelineStream } from "@/lib/langchain/rag-pipeline-stream"
import { getCurrentUser } from "@/lib/session"
import { RagChatRequestSchema } from "@/lib/validations/chat-message"
import { Source } from "@/hooks/api/chat/useRagChatMessages"

export async function POST(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
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

    console.log("Starting streaming response for message:", message)

    // Create a TransformStream for streaming
    const encoder = new TextEncoder()
    let fullResponse = ""
    let sources: Source[] = []

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Execute the streaming RAG pipeline
          const streamIterator = await executeRAGPipelineStream(
            message,
            user.id,
            conversationId,
            {
              documentIds: selectedDocuments,
            }
          )

          // Process the stream
          for await (const chunk of streamIterator) {
            if (chunk.content) {
              fullResponse += chunk.content

              // Send chunk to client
              const data = JSON.stringify({
                type: "content",
                content: chunk.content,
                conversationId: conversationId,
              })

              console.log("Streaming chunk:", chunk.content)
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }

            if (chunk.sources) {
              sources = chunk.sources
            }
          }

          // Save the complete interaction to database
          const assistantMessage = await saveChatInteraction(
            user.id,
            conversationId,
            message,
            fullResponse,
            sources
          )

          // Send final message with complete response and metadata
          const finalData = JSON.stringify({
            type: "complete",
            message: {
              id: assistantMessage?.id,
              content: fullResponse,
              role: "assistant",
              createdAt: assistantMessage?.createdAt,
              conversationId: conversationId,
              sources: sources,
            },
          })

          console.log(
            "Streaming complete. Full response length:",
            fullResponse.length
          )
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
          controller.close()
        } catch (error) {
          console.error("Error in streaming:", error)
          const errorData = JSON.stringify({
            type: "error",
            error: "Failed to process chat request",
            message: error instanceof Error ? error.message : "Unknown error",
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      },
    })

    // Return streaming response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  } catch (error) {
    console.error("Error in RAG streaming endpoint:", error)

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
