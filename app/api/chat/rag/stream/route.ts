import { NextRequest } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"
import { saveChatInteraction } from "@/lib/langchain/memory"
import {
  FileSearchSource,
  streamWithFileSearch,
} from "@/lib/openai/file-search-stream"
import { getOrCreateVectorStore } from "@/lib/openai/vector-store-service"
import { getCurrentUser } from "@/lib/session"
import { RagChatRequestSchema } from "@/lib/validations/chat-message"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const body = await req.json()
    const { message, selectedDocuments, sessionId, options } =
      RagChatRequestSchema.parse(body)

    // Create or retrieve the chat conversation
    let conversationId = sessionId

    if (!conversationId) {
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

    const encoder = new TextEncoder()
    let fullResponse = ""
    let sources: FileSearchSource[] = []

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 1. Get user's vector store
          const vectorStoreId = await getOrCreateVectorStore(user.id)

          // 2. Build fileId → { documentId, title } map for source annotation
          const docsWhere = selectedDocuments?.length
            ? { id: { in: selectedDocuments }, userId: user.id }
            : { userId: user.id }

          const userDocs = await db.document.findMany({
            where: { ...docsWhere, openaiFileId: { not: null } },
            select: { id: true, title: true, openaiFileId: true },
          })

          const fileIdToTitle = new Map(
            userDocs
              .filter((d) => d.openaiFileId)
              .map((d) => [
                d.openaiFileId!,
                { documentId: d.id, title: d.title },
              ])
          )

          // 3. Get previous response ID for conversation continuity
          const conversation = await db.chatConversation.findUnique({
            where: { id: conversationId! },
            select: { previousResponseId: true },
          })

          // 4. Stream from Responses API with file_search tool
          let newResponseId: string | undefined
          const streamIterator = streamWithFileSearch(
            message,
            vectorStoreId,
            conversation?.previousResponseId ?? undefined,
            selectedDocuments || [],
            fileIdToTitle
          )

          for await (const chunk of streamIterator) {
            if (chunk.responseId) {
              newResponseId = chunk.responseId
            }

            if (chunk.sources) {
              sources = chunk.sources
            }

            if (chunk.content) {
              fullResponse += chunk.content

              const data = JSON.stringify({
                type: "content",
                content: chunk.content,
                conversationId,
              })

              console.log("Streaming chunk:", chunk.content)
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }

          // 5. Persist conversation and save new response ID
          const assistantMessage = await saveChatInteraction(
            user.id,
            conversationId!,
            message,
            fullResponse,
            sources
          )

          if (newResponseId) {
            await db.chatConversation.update({
              where: { id: conversationId! },
              data: { previousResponseId: newResponseId },
            })
          }

          // 6. Send complete event (same shape as before — no frontend changes needed)
          const finalData = JSON.stringify({
            type: "complete",
            message: {
              id: assistantMessage?.id,
              content: fullResponse,
              role: "assistant",
              createdAt: assistantMessage?.createdAt,
              conversationId,
              sources,
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
          details: error.issues,
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
