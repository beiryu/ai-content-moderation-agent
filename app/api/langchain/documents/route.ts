import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DocumentType } from "@prisma/client";

import { loadDocumentFromBuffer } from "@/lib/langchain/document-loaders";
import { splitDocuments } from "@/lib/langchain/text-splitter";
import { processDocumentRAG } from "@/lib/langchain/rag-pipeline";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

// Define request schema for document upload
const DocumentUploadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.nativeEnum(DocumentType),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const type = formData.get("type") as DocumentType;
    const metadataStr = formData.get("metadata") as string;
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Parse and validate metadata
    let metadata = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (e) {
        return NextResponse.json(
          { error: "Invalid metadata format" },
          { status: 400 }
        );
      }
    }

    // Validate request data
    DocumentUploadSchema.parse({
      title,
      type,
      metadata,
    });

    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create document in database first
    const document = await db.document.create({
      data: {
        userId: user.id,
        title,
        type,
        content: "", // Will be filled after processing
        metadata: metadata || {},
      },
    });

    // Load document with LangChain loaders
    const langchainDocs = await loadDocumentFromBuffer(buffer, type, {
      documentId: document.id,
      documentTitle: title,
      documentType: type,
      userId: user.id,
      ...metadata,
    });

    // Split documents into chunks
    const splitDocs = await splitDocuments(langchainDocs);

    // Save content to database document
    await db.document.update({
      where: { id: document.id },
      data: {
        content: langchainDocs.map(doc => doc.pageContent).join("\n\n"),
      },
    });

    // Process each chunk through the RAG pipeline
    for (const doc of splitDocs) {
      await processDocumentRAG(doc, user.id, {
        documentId: document.id,
      });
    }

    // Return success response
    return NextResponse.json({
      success: true,
      documentId: document.id,
      message: "Document processed successfully",
    });
  } catch (error) {
    console.error("Error processing document:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to process document",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}