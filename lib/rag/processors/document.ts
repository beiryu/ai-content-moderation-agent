import { DocumentType } from "@prisma/client"
import { Document as LangChainDocument } from "langchain/document"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"

import { db } from "@/lib/db"

import { RAG_CONFIG } from "../config"
import { embedText, embeddingToString } from "../embedding"

/**
 * Document Processor
 * Handles document parsing, chunking, and vectorization
 */

// Initialize text splitter once at module load time
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: RAG_CONFIG.chunking.chunkSize,
  chunkOverlap: RAG_CONFIG.chunking.chunkOverlap,
  separators: RAG_CONFIG.chunking.separators,
})

/**
 * Split document into chunks
 */
async function chunkDocument(content: string): Promise<LangChainDocument[]> {
  const documents = [new LangChainDocument({ pageContent: content })]
  return await textSplitter.splitDocuments(documents)
}

/**
 * Process a document: parse, chunk, embed, and store
 */
export async function processDocument(
  userId: string,
  title: string,
  content: string,
  type: DocumentType,
  metadata?: Record<string, any>
): Promise<string> {
  try {
    // Create document record
    const document = await db.document.create({
      data: {
        userId,
        title,
        type,
        content,
        metadata: metadata || {},
      },
    })

    // Split document into chunks
    const chunks = await chunkDocument(content)

    // Process chunks in batches
    const chunkPromises = chunks.map(async (chunk, index) => {
      try {
        // Generate embedding for chunk
        const embedding = await embedText(chunk.pageContent)
        const embeddingString = embeddingToString(embedding)

        // Store chunk with embedding
        return await db.documentChunk.create({
          data: {
            documentId: document.id,
            content: chunk.pageContent,
            metadata: {
              ...chunk.metadata,
              chunkSize: chunk.pageContent.length,
              documentType: type,
              documentTitle: title,
            },
            embedding: embeddingString,
            chunkIndex: index,
          },
        })
      } catch (error) {
        console.error(`Error processing chunk ${index}:`, error)
        throw error
      }
    })

    await Promise.all(chunkPromises)

    return document.id
  } catch (error) {
    console.error("Error processing document:", error)
    throw new Error("Failed to process document")
  }
}

/**
 * Update document embeddings
 */
export async function updateDocumentEmbeddings(
  documentId: string
): Promise<void> {
  const chunks = await db.documentChunk.findMany({
    where: { documentId },
  })

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.content)
    const embeddingString = embeddingToString(embedding)

    await db.documentChunk.update({
      where: { id: chunk.id },
      data: { embedding: embeddingString },
    })
  }
}

/**
 * Process existing document with new content (reprocessing)
 */
export async function processExistingDocument(
  documentId: string,
  content: string,
  type: DocumentType,
  metadata: Record<string, any>
): Promise<void> {
  try {
    // Update document content
    await db.document.update({
      where: { id: documentId },
      data: {
        content,
        type,
        metadata,
        updatedAt: new Date(),
      },
    })

    // Remove existing chunks
    await db.documentChunk.deleteMany({
      where: { documentId },
    })

    // Split document into new chunks
    const chunks = await chunkDocument(content)

    // Process chunks in batches
    const chunkPromises = chunks.map(async (chunk, index) => {
      try {
        // Generate embedding for chunk
        const embedding = await embedText(chunk.pageContent)
        const embeddingString = embeddingToString(embedding)

        // Store chunk with embedding
        return await db.documentChunk.create({
          data: {
            documentId,
            content: chunk.pageContent,
            metadata: {
              ...chunk.metadata,
              chunkSize: chunk.pageContent.length,
              documentType: type,
              ...metadata,
            },
            embedding: embeddingString,
            chunkIndex: index,
          },
        })
      } catch (error) {
        console.error(`Error processing chunk ${index}:`, error)
        throw error
      }
    })

    await Promise.all(chunkPromises)
  } catch (error) {
    console.error("Error reprocessing document:", error)
    throw new Error("Failed to reprocess document")
  }
}

/**
 * Delete document and all its chunks
 */
export async function deleteDocument(documentId: string): Promise<void> {
  await db.documentChunk.deleteMany({
    where: { documentId },
  })

  await db.document.delete({
    where: { id: documentId },
  })
}
