import { NextRequest, NextResponse } from "next/server";
import { DocumentType } from "@prisma/client";
import { z } from "zod";



import { db } from "@/lib/db";
import {
  loadDocumentFromBuffer,
  loadDocumentFromString,
} from "@/lib/langchain/document-loaders"
import { processDocumentRAG } from "@/lib/langchain/rag-pipeline";
import { splitDocuments } from "@/lib/langchain/text-splitter";
import { getCurrentUser } from "@/lib/session";
import { CreateDocumentRequestSchema } from "@/lib/validations/document"





// Define request schema for document upload via form data
const DocumentUploadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.nativeEnum(DocumentType),
  metadata: z.record(z.any()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check content-type to determine how to process the request
    const contentType = req.headers.get("content-type") || ""

    // Handle multipart form data (file upload)
    if (contentType.includes("multipart/form-data")) {
      // Parse form data
      const formData = await req.formData()
      const title = formData.get("title") as string
      const type = formData.get("type") as DocumentType
      const metadataStr = formData.get("metadata") as string
      const file = formData.get("file") as File

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      // Parse and validate metadata
      let metadata = {}
      if (metadataStr) {
        try {
          metadata = JSON.parse(metadataStr)
        } catch (e) {
          return NextResponse.json(
            { error: "Invalid metadata format" },
            { status: 400 }
          )
        }
      }

      // Validate request data
      DocumentUploadSchema.parse({
        title,
        type,
        metadata,
      })

      // Read file as buffer
      const buffer = Buffer.from(await file.arrayBuffer())

      // Create document in database first
      const document = await db.document.create({
        data: {
          userId: user.id,
          title,
          type,
          content: "", // Will be filled after processing
          metadata: metadata || {},
        },
      })

      // Load document with LangChain loaders
      const langchainDocs = await loadDocumentFromBuffer(buffer, type, {
        documentId: document.id,
        documentTitle: title,
        documentType: type,
        userId: user.id,
        ...metadata,
      })

      // Split documents into chunks
      const splitDocs = await splitDocuments(langchainDocs)

      // Save content to database document
      await db.document.update({
        where: { id: document.id },
        data: {
          content: langchainDocs.map((doc) => doc.pageContent).join("\n\n"),
        },
      })

      // Process each chunk through the RAG pipeline
      for (const doc of splitDocs) {
        await processDocumentRAG(doc, user.id, {
          documentId: document.id,
        })
      }

      return NextResponse.json({
        success: true,
        documentId: document.id,
        message: "Document processed successfully",
      })
    } else {
      // Handle JSON request (direct content)
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

      return NextResponse.json({
        success: true,
        documentId: document.id,
        message: "Document processed successfully",
      })
    }
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