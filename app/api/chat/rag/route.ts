import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { ConfigService } from "@/lib/config/config.service"
import { db } from "@/lib/db"
import { saveChatInteraction } from "@/lib/langchain/memory"
import {
  streamDocumentChatWithoutFileSearch,
  streamWithFileSearch,
} from "@/lib/openai/file-search-stream"
import {
  getCachedUserDocs,
  getOrCreateVectorStore,
} from "@/lib/openai/vector-store-service"
import { getCurrentUser } from "@/lib/session"
import { RagChatRequestSchema } from "@/lib/validations/chat-message"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const config = await ConfigService.forUser(user.id)

    const body = await req.json()
    const { message, selectedDocuments, sessionId } =
      RagChatRequestSchema.parse(body)

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

    const hasDocSelection =
      Array.isArray(selectedDocuments) && selectedDocuments.length > 0

    let vectorStoreId = ""
    let userDocs: Awaited<ReturnType<typeof getCachedUserDocs>> = []

    if (hasDocSelection) {
      ;[vectorStoreId, userDocs] = await Promise.all([
        getOrCreateVectorStore(user.id),
        getCachedUserDocs(user.id, selectedDocuments),
      ])
    }

    const fileIdToTitle = new Map(
      userDocs
        .filter((d) => d.openaiFileId)
        .map((d) => [d.openaiFileId!, { documentId: d.id, title: d.title }])
    )

    const conversation = await db.chatConversation.findUnique({
      where: { id: conversationId! },
      select: { previousResponseId: true },
    })

    const prevId = conversation?.previousResponseId ?? undefined
    const modelArgs = {
      model: config.openai.chat.model,
      temperature: config.openai.chat.temperature,
      maxOutputTokens: config.openai.chat.maxTokens,
    }

    // Collect full response from the streaming generator
    let fullResponse = ""
    let sources: any[] = []
    let newResponseId: string | undefined

    const streamIterator = hasDocSelection
      ? streamWithFileSearch(
          message,
          vectorStoreId,
          prevId,
          selectedDocuments,
          fileIdToTitle,
          modelArgs
        )
      : streamDocumentChatWithoutFileSearch(message, prevId, modelArgs)

    for await (const chunk of streamIterator) {
      if (chunk.responseId) newResponseId = chunk.responseId
      if (chunk.sources) sources = chunk.sources
      if (chunk.content) fullResponse += chunk.content
    }

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

    return NextResponse.json(assistantMessage)
  } catch (error) {
    console.error("Error in RAG endpoint:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
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
