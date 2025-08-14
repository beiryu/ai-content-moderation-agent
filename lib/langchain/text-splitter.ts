/**
 * LangChain Text Splitters
 * Handles splitting documents into chunks for efficient processing
 */

import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter, MarkdownTextSplitter } from "@langchain/textsplitters";



import { RAG_CONFIG } from "../../config/rag";


/**
 * Create a default text splitter based on configuration
 */
export function createDefaultTextSplitter() {
  return new RecursiveCharacterTextSplitter({
    chunkSize: RAG_CONFIG.chunking.chunkSize,
    chunkOverlap: RAG_CONFIG.chunking.chunkOverlap,
  });
}

/**
 * Create a markdown-specific text splitter
 */
export function createMarkdownTextSplitter() {
  return new MarkdownTextSplitter({
    chunkSize: RAG_CONFIG.chunking.chunkSize,
    chunkOverlap: RAG_CONFIG.chunking.chunkOverlap,
  });
}

/**
 * Split documents based on their content type
 */
export async function splitDocuments(
  documents: Document[],
  options?: {
    useMarkdownSplitter?: boolean;
    chunkSize?: number;
    chunkOverlap?: number;
  }
): Promise<Document[]> {
  try {
    const {
      useMarkdownSplitter = false,
      chunkSize = RAG_CONFIG.chunking.chunkSize,
      chunkOverlap = RAG_CONFIG.chunking.chunkOverlap,
    } = options || {};

    let splitter = useMarkdownSplitter
      ? createMarkdownTextSplitter()
      : createDefaultTextSplitter();

    // Override defaults if custom values are provided
    if (chunkSize !== RAG_CONFIG.chunking.chunkSize || 
        chunkOverlap !== RAG_CONFIG.chunking.chunkOverlap) {
      splitter = useMarkdownSplitter
        ? new MarkdownTextSplitter({ chunkSize, chunkOverlap })
        : new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });
    }

    return await splitter.splitDocuments(documents);
  } catch (error) {
    console.error("Error splitting documents:", error);
    throw new Error("Failed to split documents");
  }
}