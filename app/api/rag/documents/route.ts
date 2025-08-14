import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getUserKnowledgeBaseSummary, processDocument } from "@/lib/rag"
import { getCurrentUser } from "@/lib/session"

const processDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(10),
  type: z.enum([
    "RESUME",
    "COVER_LETTER",
    "PORTFOLIO",
    "JOB_DESCRIPTION",
    "NOTES",
  ]),
  metadata: z.record(z.any()).optional(),
})

/**
 * POST /api/rag/documents
 * Process and index a document in the RAG system
 */
export async function POST(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate request body
    const body = await req.json()
    const { title, content, type, metadata } = processDocumentSchema.parse(body)

    // Process the document
    const documentId = await processDocument(
      user.id,
      title,
      content,
      type as any,
      metadata
    )

    return NextResponse.json({
      success: true,
      documentId,
      message: "Document processed successfully",
    })
  } catch (error) {
    console.error("Error processing document:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rag/documents
 * Get user's knowledge base summary
 */
export async function GET(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get knowledge base summary
    const summary = await getUserKnowledgeBaseSummary(user.id)

    return NextResponse.json({
      success: true,
      summary,
    })
  } catch (error) {
    console.error("Error getting knowledge base summary:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
