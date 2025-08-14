/**
 * LangChain Document Loaders
 * Handles loading and processing different types of documents
 */

import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { JSONLoader } from "@langchain/community/fs/json"
import { TextLoader } from "@langchain/community/fs/text"
import { Document } from "@langchain/core/documents"
import { DocumentType } from "@prisma/client";





/**
 * Load document from blob/buffer based on its type
 */
export async function loadDocumentFromBuffer(
  buffer: Buffer,
  type: DocumentType,
  metadata: Record<string, any> = {}
): Promise<Document[]> {
  try {
    let docs: Document[] = [];

    switch (type) {
      case DocumentType.PDF:
        const pdfLoader = new PDFLoader(new Blob([buffer]));
        docs = await pdfLoader.load();
        break;
      case DocumentType.DOCX:
        const docxLoader = new DocxLoader(new Blob([buffer]));
        docs = await docxLoader.load();
        break;
      case DocumentType.TEXT:
        const textLoader = new TextLoader(new Blob([buffer]));
        docs = await textLoader.load();
        break;
      case DocumentType.CSV:
        const csvLoader = new CSVLoader(new Blob([buffer]));
        docs = await csvLoader.load();
        break;
      case DocumentType.JSON:
        const jsonLoader = new JSONLoader(
          new Blob([buffer]),
          "/texts"
        );
        docs = await jsonLoader.load();
        break;
      default:
        // Default to text loader for unknown types
        const defaultLoader = new TextLoader(new Blob([buffer]));
        docs = await defaultLoader.load();
    }

    // Add metadata to all documents
    return docs.map((doc) => {
      return {
        ...doc,
        metadata: {
          ...doc.metadata,
          ...metadata,
          documentType: type,
        },
      };
    });
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