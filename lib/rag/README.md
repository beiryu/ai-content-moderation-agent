# RAG Infrastructure for AI Interview Assistant

This document outlines the Retrieval-Augmented Generation (RAG) infrastructure that powers the real-time interview assistant.

## Architecture Overview

The RAG system consists of several key components:

### Core Components

1. **Vector Store** (`vector-store.ts`)

   - Manages Pinecone vector database operations
   - Handles embedding storage and similarity search
   - Provides hybrid search capabilities

2. **Embedding Service** (`embedding.ts`)

   - Generates embeddings using OpenAI's text-embedding-3-small
   - Handles embedding conversion and similarity calculations
   - Manages batch processing for efficiency

3. **Document Processor** (`processors/document.ts`)

   - Parses and chunks documents (resumes, job descriptions, notes)
   - Generates embeddings for each chunk
   - Stores processed content in database with metadata

4. **Retrieval Service** (`retrieval.ts`)
   - Combines vector search and keyword search
   - Ranks and filters results by relevance
   - Logs queries for analytics and improvement

### Memory System

5. **Short-term Memory** (`memory/short-term.ts`)

   - Stores conversation context within interview sessions
   - Tracks recent questions and responses
   - Manages session-specific information

6. **Long-term Memory** (`memory/long-term.ts`)

   - Persists insights across multiple interviews
   - Stores performance patterns and trends
   - Consolidates learnings into actionable insights

7. **Memory Orchestrator** (`memory/orchestrator.ts`)
   - Coordinates between short-term and long-term memory
   - Determines memory importance and promotion
   - Provides contextual information for response generation

### Main System

8. **RAG System** (`system.ts`)
   - Main orchestrator for all RAG operations
   - Provides high-level API for document processing
   - Generates response suggestions and manages user interactions

## Setup Instructions

### 1. Environment Configuration

Copy the environment variables from `.env.rag.example` to your `.env` file:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=interview-assistant

# Optional (uses defaults if not specified)
PINECONE_NAMESPACE=default
```

### 2. Database Setup

The RAG system requires these database models (already in schema.prisma):

- `Document` - Stores document metadata
- `DocumentChunk` - Stores chunked content with embeddings
- `InterviewMemory` - Stores short-term and long-term memories
- `RAGQueryLog` - Logs retrieval queries for analytics

Run the database migration:

```bash
npx prisma db push
npx prisma generate
```

### 3. Vector Database Setup

Create a Pinecone index with these specifications:

- **Dimension**: 1536 (for text-embedding-3-small)
- **Metric**: cosine
- **Pod Type**: p1.x1 (for starter) or s1.x1 (for production)

### 4. Initialize the System

Run the initialization script:

```bash
npx tsx scripts/init-rag.ts
```

## Usage Examples

### Processing Documents

````typescript
import { ragSystem } from "@/lib/rag"

// Initialize the system
await ragSystem.initialize()

### Generating Response Suggestions

```typescript
// During an interview session
const suggestions = await ragSystem.generateResponseSuggestions(
  userId,
  sessionId,
  "Tell me about a challenging project you worked on",
  "behavioral"
)

console.log(suggestions.suggestions) // Response suggestions
console.log(suggestions.frameworks) // STAR method, etc.
console.log(suggestions.relevantExperience) // From resume
````

### Managing Memory

```typescript
import { memoryOrchestrator } from "@/lib/rag"

// Store an interaction
await memoryOrchestrator.storeInteraction(
  userId,
  sessionId,
  question,
  userResponse,
  { helpful: true, accuracy: 8, relevance: 9 }
)

// Get personalized context
const context = await memoryOrchestrator.getPersonalizedContext(
  userId,
  sessionId,
  currentQuestion
)
```

### Completing Interview Session

```typescript
// At the end of an interview
await ragSystem.completeInterviewSession(userId, sessionId, {
  duration: 3600, // seconds
  questionsAnswered: 12,
  overallScore: 7.5,
  strengths: ["Technical knowledge", "Communication"],
  weaknesses: ["Needs more examples", "Speaking pace"],
  improvements: ["Provided more specific examples"],
})
```

## Configuration

The system is configured via `RAG_CONFIG` in `config.ts`:

```typescript
export const RAG_CONFIG = {
  embedding: {
    model: "text-embedding-3-small",
    dimensions: 1536,
    batchSize: 100,
  },
  vectorDb: {
    indexName: "interview-assistant",
    namespace: "default",
    topK: 5,
  },
  chunking: {
    chunkSize: 1000,
    chunkOverlap: 200,
  },
  memory: {
    shortTermRetentionDays: 7,
    longTermRetentionMonths: 12,
    maxShortTermEntries: 100,
    maxLongTermEntries: 1000,
  },
  search: {
    similarityThreshold: 0.7,
    maxResults: 10,
    hybridSearchWeight: 0.7,
  },
}
```

## Performance Considerations

### Embedding Generation

- Batch processing reduces API calls
- Embeddings are cached in database
- Use appropriate chunk sizes for your content

### Vector Search

- Pinecone provides millisecond search times
- Use metadata filtering to improve relevance
- Consider namespace organization for multi-tenancy

### Memory Management

- Automatic cleanup of old memories
- Importance-based retention
- Configurable limits to prevent unbounded growth

## Monitoring and Analytics

The system logs:

- Query performance metrics
- Memory usage patterns
- User interaction feedback
- System errors and warnings

Access logs via:

```typescript
// Get knowledge base summary
const summary = await ragSystem.getKnowledgeBaseSummary(userId)

// Get performance trends
const trends = await ragSystem.getPerformanceTrends(userId)
```

## Next Steps (Sprint 2+)

1. **Tool Integration**: Implement specialized tools (code analyzer, web search)
2. **Advanced Retrieval**: Add reranking and query expansion
3. **Real-time Sync**: Sync embeddings with vector store
4. **Performance Optimization**: Caching, connection pooling
5. **Analytics Dashboard**: Visualization of system metrics

## Troubleshooting

### Common Issues

1. **"RAG system not initialized"**

   - Call `ragSystem.initialize()` before other operations

2. **Vector store connection errors**

   - Check Pinecone API key and index name
   - Verify index exists and has correct dimensions

3. **Embedding generation failures**

   - Verify OpenAI API key and quota
   - Check content length limits

4. **Database connection issues**
   - Run `npx prisma generate` after schema changes
   - Ensure DATABASE_URL is correct

### Performance Issues

1. **Slow document processing**

   - Reduce chunk size or batch size
   - Check database connection performance

2. **Poor search relevance**
   - Adjust similarity threshold
   - Review metadata filtering
   - Consider content preprocessing

## Security Considerations

- API keys should be stored securely
- User data is isolated by userId
- Embeddings don't contain original text
- Memory cleanup prevents data leakage
- Regular security audits recommended
