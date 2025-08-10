import { NextRequest, NextResponse } from "next/server"

import { db } from "@/lib/db"
import { processDocumentContent } from "@/lib/rag/system"
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
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Verify document belongs to user
    const document = await db.document.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!document) {
      return new NextResponse("Document not found", { status: 404 })
    }

    // Delete document and chunks
    await db.documentChunk.deleteMany({
      where: {
        documentId: params.id,
      },
    })

    await db.document.delete({
      where: {
        id: params.id,
      },
    })

    return new NextResponse("Document deleted successfully", { status: 200 })
  } catch (error) {
    console.error("Error deleting document:", error)
    return new NextResponse("Failed to delete document", { status: 500 })
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
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Verify document belongs to user
    const existingDocument = await db.document.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!existingDocument) {
      return new NextResponse("Document not found", { status: 404 })
    }

    // Get request data
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
          metadata: metadata || existingDocument.metadata,
        },
      })

      // Reprocess document chunks (this will handle chunk deletion and recreation)
      await processDocumentContent(
        params.id,
        content,
        existingDocument.type,
        metadata || existingDocument.metadata || {}
      )
    } else {
      // Just update metadata and title
      await db.document.update({
        where: {
          id: params.id,
        },
        data: {
          title: title || existingDocument.title,
          metadata: metadata || existingDocument.metadata,
        },
      })
    }

    return new NextResponse("Document updated successfully", { status: 200 })
  } catch (error) {
    console.error("Error updating document:", error)
    return new NextResponse("Failed to update document", { status: 500 })
  }
}
