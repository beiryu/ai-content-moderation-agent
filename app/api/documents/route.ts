import { NextRequest, NextResponse } from "next/server"
import { DocumentType } from "@prisma/client"
import { z } from "zod"

import { db } from "@/lib/db"
import { processDocument } from "@/lib/rag/system"
import { getCurrentUser } from "@/lib/session"
import { CreateDocumentRequestSchema } from "@/lib/validations/document"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, content, type, metadata } =
      CreateDocumentRequestSchema.parse(body)

    // Process the document
    const documentId = await processDocument(
      user.id,
      title,
      content,
      type as DocumentType,
      metadata
    )

    return NextResponse.json(documentId)
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

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const documents = await db.document.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}
