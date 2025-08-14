/**
 * LangChain RAG Pipeline
 * Implements a complete Retrieval Augmented Generation pipeline using LangChain
 */

import { Document } from "@langchain/core/documents";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { formatDocumentsAsString } from "langchain/util/document";

import { getPineconeStore, searchSimilarDocuments } from "./vector-store";
import { createMemoryWithHistory } from "./memory";
import { RAG_CONFIG } from "../../config/rag";

/**
 * Create the LLM instance
 */
export function createLLM(options?: {
  modelName?: string;
  temperature?: number;
  streaming?: boolean;
}) {
  const {
    modelName = "gpt-4o",
    temperature = 0.2,
    streaming = false,
  } = options || {};

  return new ChatOpenAI({
    modelName,
    temperature,
    streaming,
  });
}

/**
 * Create the RAG prompt template
 */
export function createRAGPromptTemplate() {
  return ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `You are a helpful AI assistant. Use the following context to answer the user's question. 
      If you don't know the answer, say that you don't know. DO NOT make up an answer.
      
      Context:
      {context}`
    ),
    new MessagesPlaceholder("chat_history"),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
  ]);
}

/**
 * Create a RAG chain with memory
 */
export async function createRAGChain(
  userId: string,
  conversationId: string,
  options?: {
    modelName?: string;
    temperature?: number;
    streaming?: boolean;
  }
) {
  // Create the LLM
  const llm = createLLM(options);
  
  // Create memory with history
  const memory = await createMemoryWithHistory(userId, conversationId);
  
  // Create the prompt template
  const promptTemplate = createRAGPromptTemplate();
  
  // Create the RAG chain
  const chain = RunnableSequence.from([
    {
      input: (query) => query,
      chat_history: async () => {
        const memoryVariables = await memory.loadMemoryVariables({});
        return memoryVariables.chat_history || [];
      },
      context: async (query) => {
        // Retrieve relevant documents
        const docs = await searchSimilarDocuments(query, {
          k: RAG_CONFIG.vectorDb.topK,
          filter: { userId: { $eq: userId } },
        });
        
        // Format documents as string
        return formatDocumentsAsString(docs);
      },
    },
    promptTemplate,
    llm,
    new StringOutputParser(),
  ]);
  
  return {
    chain,
    memory,
  };
}

/**
 * Execute the RAG pipeline with a query
 */
export async function executeRAGPipeline(
  query: string,
  userId: string,
  conversationId: string,
  options?: {
    documentIds?: string[];
    modelName?: string;
    temperature?: number;
    streaming?: boolean;
  }
) {
  try {
    const { chain, memory } = await createRAGChain(
      userId,
      conversationId,
      options
    );
    
    // Execute the chain
    const response = await chain.invoke(query);
    
    // Save to memory
    await memory.saveContext(
      { input: query },
      { output: response }
    );
    
    return {
      response,
      sources: [], // Would need to modify to track sources
    };
  } catch (error) {
    console.error("Error executing RAG pipeline:", error);
    throw new Error(`Failed to execute RAG pipeline: ${error}`);
  }
}

/**
 * Process a document through the complete pipeline (split, embed, store)
 */
export async function processDocumentRAG(
  document: Document,
  userId: string,
  options?: {
    namespace?: string;
    documentId?: string;
  }
) {
  try {
    // Add userId to metadata
    const documentWithUserId = {
      ...document,
      metadata: {
        ...document.metadata,
        userId,
        documentId: options?.documentId || document.metadata.documentId,
      },
    };
    
    // Get the vector store
    const store = await getPineconeStore();
    
    // Add document to vector store
    await store.addDocuments([documentWithUserId], {
      namespace: options?.namespace || RAG_CONFIG.vectorDb.namespace,
    });
    
    return true;
  } catch (error) {
    console.error("Error processing document through RAG pipeline:", error);
    throw new Error(`Failed to process document through RAG pipeline: ${error}`);
  }
}