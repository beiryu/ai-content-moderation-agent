/**
 * LangChain Document Loaders
 * Handles loading and processing plain text documents
 */

import { Document } from "@langchain/core/documents"
import { DocumentType } from "@prisma/client";





/**
 * Load document from blob/buffer as plain text
 * This simplified version only supports plain text loading
 */
export async function loadDocumentFromBuffer(
  buffer: Buffer,
  type: DocumentType,
  metadata: Record<string, any> = {}
): Promise<Document[]> {
  try {
    // Convert buffer to string (plain text)
    const textContent = buffer.toString('utf-8');
    
    // Create a document with the text content
    const doc = new Document({
      pageContent: textContent,
      metadata: {
        ...metadata,
        documentType: type,
      },
    })

    return [doc];
  } catch (error) {
    console.error(`Error loading document of type ${type}:`, error);
    throw new Error(`Failed to load document of type ${type}`);
  }
}

/**
 * Load document from string content
 */
export function loadDocumentFromString(
  content: string,
  metadata: Record<string, any> = {}
): Document[] {
  return [
    new Document({
      pageContent: content,
      metadata: {
        ...metadata,
      },
    }),
  ];
}