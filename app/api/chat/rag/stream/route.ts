import { NextRequest } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"
import { saveChatInteraction } from "@/lib/langchain/memory"
import {
  FileSearchSource,
  streamWithFileSearch,
} from "@/lib/openai/file-search-stream"
import {
  getCachedUserDocs,
  getOrCreateVectorStore,
} from "@/lib/openai/vector-store-service"
import redis from "@/lib/redis"
import { getCurrentUser } from "@/lib/session"
import { RagChatRequestSchema } from "@/lib/validations/chat-message"

const PREV_RESP_TTL = 86400 // 24h

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

    // Run all setup queries in parallel — previousResponseId served from Redis
    // to avoid a DB round-trip on every conversational turn.
    const prevRespCacheKey = conversationId
      ? `prev_resp:${conversationId}`
      : null

    const [vectorStoreId, userDocs, cachedPrevRespId] = await Promise.all([
      getOrCreateVectorStore(user.id),
      getCachedUserDocs(
        user.id,
        selectedDocuments?.length ? selectedDocuments : undefined
      ),
      prevRespCacheKey ? redis.get(prevRespCacheKey) : Promise.resolve(null),
    ])

    // Fall back to DB only on Redis miss (first turn or cache eviction)
    let previousResponseId: string | null | undefined = cachedPrevRespId
    if (!previousResponseId && conversationId) {
      const conv = await db.chatConversation.findUnique({
        where: { id: conversationId },
        select: { previousResponseId: true },
      })
      previousResponseId = conv?.previousResponseId ?? null
    }

    const fileIdToTitle = new Map(
      userDocs
        .filter((d) => d.openaiFileId)
        .map((d) => [d.openaiFileId!, { documentId: d.id, title: d.title }])
    )

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send an immediate "thinking" signal so the UI can show a typing indicator
          // before the OpenAI file_search round-trip completes (~400-1500ms)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "thinking",
                conversationId,
              })}\n\n`
            )
          )

          // Stream from Responses API with file_search tool
          let newResponseId: string | undefined
          const streamIterator = streamWithFileSearch(
            message,
            vectorStoreId,
            previousResponseId ?? undefined,
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

          // Send complete event immediately — don't block on DB writes
          const finalData = JSON.stringify({
            type: "complete",
            message: {
              content: fullResponse,
              role: "assistant",
              conversationId,
              sources,
            },
          })

          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
          controller.close()

          // Fire-and-forget: persist to DB and update Redis cache after the
          // stream is already closed — client is unblocked immediately.
          Promise.all([
            saveChatInteraction(
              user.id,
              conversationId!,
              message,
              fullResponse,
              sources
            ).then((saved) => {
              if (newResponseId && conversationId) {
                const key = `prev_resp:${conversationId}`
                return Promise.all([
                  redis.set(key, newResponseId, "EX", PREV_RESP_TTL),
                  db.chatConversation.update({
                    where: { id: conversationId },
                    data: { previousResponseId: newResponseId },
                  }),
                ])
              }
            }),
          ]).catch((err) =>
            console.error("Post-stream persistence error:", err)
          )
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
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        // Prevents nginx/CDN from buffering SSE chunks — critical for low TTFT
        "X-Accel-Buffering": "no",
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
