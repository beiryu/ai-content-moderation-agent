import { NextRequest, NextResponse } from "next/server";
import { DocumentType } from "@prisma/client";
import { z } from "zod";



import { db } from "@/lib/db"
import { loadDocumentFromString } from "@/lib/langchain/document-loaders"
import { processDocumentRAG } from "@/lib/langchain/rag-pipeline"
import { splitDocuments } from "@/lib/langchain/text-splitter"
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

    // Create document in database first
    const document = await db.document.create({
      data: {
        userId: user.id,
        title,
        type,
        content,
        metadata: metadata || {},
      },
    })

    // Load document with LangChain
    const langchainDocs = loadDocumentFromString(content, {
      documentId: document.id,
      documentTitle: title,
      documentType: type,
      userId: user.id,
      ...metadata,
    })

    // Split documents into chunks
    const splitDocs = await splitDocuments(langchainDocs)

    // Process each chunk through the RAG pipeline
    for (const doc of splitDocs) {
      await processDocumentRAG(doc, user.id, {
        documentId: document.id,
      })
    }

    const documentId = document.id

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