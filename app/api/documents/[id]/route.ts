import { NextRequest, NextResponse } from "next/server";



import { db } from "@/lib/db";
import {
  loadDocumentFromBuffer,
  loadDocumentFromString,
} from "@/lib/langchain/document-loaders"
import { processDocumentRAG } from "@/lib/langchain/rag-pipeline"
import { splitDocuments } from "@/lib/langchain/text-splitter"
import { deleteDocumentsFromPinecone } from "@/lib/langchain/vector-store"
import { getCurrentUser } from "@/lib/session"

interface Params {
  params: {
    id: string
  }
}

/**
 * GET /api/documents/[id]
 * Get a specific document
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get document by ID and ensure it belongs to user
    const document = await db.document.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            metadata: true,
            chunkIndex: true,
          },
        },
      },
    })

    if (!document) {
      return new NextResponse("Document not found", { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error fetching document:", error)
    return new NextResponse("Failed to fetch document", { status: 500 })
  }
}

/**
 * DELETE /api/documents/[id]
 * Delete a document and all its chunks
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify document belongs to user
    const document = await db.document.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Delete document chunks from database
    await db.documentChunk.deleteMany({
      where: {
        documentId: params.id,
      },
    })

    // Delete document chunks from Pinecone
    try {
      await deleteDocumentsFromPinecone(
        [params.id], // Using document ID as the namespace filter
        `doc-${params.id}` // Use document-specific namespace
      )
    } catch (deleteError) {
      console.error("Error deleting from vector store:", deleteError)
      // Continue with database deletion even if vector store deletion fails
    }

    // Delete the document from database
    await db.document.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/documents/[id]
 * Update a document
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify document belongs to user
    const existingDocument = await db.document.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!existingDocument) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check content-type to determine how to process the request
    const contentType = req.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      // Handle file update
      const formData = await req.formData()
      const title = formData.get("title") as string
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

      // Read file as buffer
      const buffer = Buffer.from(await file.arrayBuffer())

      // Update basic document info
      await db.document.update({
        where: {
          id: params.id,
        },
        data: {
          title: title || existingDocument.title,
          metadata: metadata || existingDocument.metadata || {},
        },
      })

      // Delete existing chunks
      await db.documentChunk.deleteMany({
        where: {
          documentId: params.id,
        },
      })

      // Load document with LangChain loaders
      const langchainDocs = await loadDocumentFromBuffer(
        buffer,
        existingDocument.type,
        {
          documentId: params.id,
          documentTitle: title || existingDocument.title,
          documentType: existingDocument.type,
          userId: user.id,
          ...(metadata || existingDocument.metadata || {}),
        }
      )

      // Save content to document
      await db.document.update({
        where: { id: params.id },
        data: {
          content: langchainDocs.map((doc) => doc.pageContent).join("\n\n"),
        },
      })

      // Split documents into chunks
      const splitDocs = await splitDocuments(langchainDocs)

      // Process each chunk through the RAG pipeline
      for (const doc of splitDocs) {
        await processDocumentRAG(doc, user.id, {
          documentId: params.id,
        })
      }
    } else {
      // Handle JSON request (direct content)
      const { title, content, metadata } = await req.json()

      // If content has changed, reprocess document
      if (content && content !== existingDocument.content) {
        // Update document first
        await db.document.update({
          where: {
            id: params.id,
          },
          data: {
            title: title || existingDocument.title,
            content: content,
            metadata: metadata || existingDocument.metadata || {},
          },
        })

        // Delete existing chunks
        await db.documentChunk.deleteMany({
          where: {
            documentId: params.id,
          },
        })

        // Load document with LangChain
        const langchainDocs = loadDocumentFromString(content, {
          documentId: params.id,
          documentTitle: title || existingDocument.title,
          documentType: existingDocument.type,
          userId: user.id,
          ...(metadata || existingDocument.metadata || {}),
        })

        // Split documents into chunks
        const splitDocs = await splitDocuments(langchainDocs)

        // Process each chunk through the RAG pipeline
        for (const doc of splitDocs) {
          await processDocumentRAG(doc, user.id, {
            documentId: params.id,
          })
        }
      } else {
        // Just update metadata and title
        await db.document.update({
          where: {
            id: params.id,
          },
          data: {
            title: title || existingDocument.title,
            metadata: metadata || existingDocument.metadata || {},
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Document updated successfully",
    })
  } catch (error) {
    console.error("Error updating document:", error)
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    )
  }
}