# Document API Documentation

This document outlines the Document API endpoints and their functionality. The Document API provides a unified interface for creating, retrieving, updating, and deleting documents with integrated RAG (Retrieval Augmented Generation) capabilities.

## Base URL

All endpoints are relative to the base URL of your application.

## Endpoints

### Document Management

#### `POST /api/documents`

Creates a new document and processes it through the RAG pipeline.

**Supports two formats:**

1. **JSON Payload:**

```json
{
  "title": "Document Title",
  "type": "RESUME | JOB_DESCRIPTION | PORTFOLIO | COVER_LETTER | NOTES",
  "content": "Document content text",
  "metadata": {
    // Optional additional data
  }
}
```

2. **Multipart Form Data:**

Enables file uploads.

- `title`: Document title
- `type`: Document type (RESUME | JOB_DESCRIPTION | PORTFOLIO | COVER_LETTER | NOTES)
- `file`: File to be uploaded
- `metadata`: Optional JSON string with additional metadata

**Response:**

```json
{
  "success": true,
  "documentId": "document-id",
  "message": "Document processed successfully"
}
```

#### `GET /api/documents`

Retrieves all documents belonging to the current user.

**Response:**

```json
[
  {
    "id": "document-id",
    "title": "Document Title",
    "type": "RESUME",
    "content": "Document content...",
    "metadata": {},
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "_count": {
      "chunks": 10
    }
  }
  // ...more documents
]
```

#### `GET /api/documents/{id}`

Retrieves a specific document by ID.

**Response:**

```json
{
  "id": "document-id",
  "title": "Document Title",
  "type": "RESUME",
  "content": "Document content...",
  "metadata": {},
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z",
  "chunks": [
    {
      "id": "chunk-id",
      "content": "Chunk content...",
      "metadata": {},
      "chunkIndex": 0
    }
    // ...more chunks
  ]
}
```

#### `PUT /api/documents/{id}`

Updates an existing document.

**Supports two formats:**

1. **JSON Payload:**

```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "metadata": {}
}
```

2. **Multipart Form Data:**

For file updates.

- `title`: Updated title
- `file`: New file content
- `metadata`: Optional JSON string with updated metadata

**Response:**

```json
{
  "success": true,
  "message": "Document updated successfully"
}
```

#### `DELETE /api/documents/{id}`

Deletes a document and all its associated chunks.

**Response:**

```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### RAG (Retrieval Augmented Generation)

#### `POST /api/documents/rag`

Processes a user query using RAG against selected documents.

**Request:**

```json
{
  "message": "What skills are mentioned in my resume?",
  "selectedDocuments": ["document-id1", "document-id2"],
  "sessionId": "optional-session-id",
  "options": {
    "includeCitations": true,
    "tonePreference": "professional | conversational | technical",
    "modelName": "optional-model-name",
    "temperature": 0.7
  }
}
```

**Response:**

```json
{
  "id": "message-id",
  "conversationId": "conversation-id",
  "role": "assistant",
  "content": "Based on your resume...",
  "sources": [
    {
      "documentId": "document-id",
      "chunkId": "chunk-id",
      "content": "Relevant chunk content...",
      "relevanceScore": 0.95
    }
  ],
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

## Authentication

All endpoints require user authentication. Requests without a valid authenticated session will receive a 401 Unauthorized response.

## Error Handling

Errors are returned in a standardized format:

```json
{
  "error": "Error message",
  "details": {} // Optional additional error details
}
```

Common HTTP status codes:

- 200: Success
- 400: Bad Request (invalid input)
- 401: Unauthorized
- 404: Resource Not Found
- 500: Internal Server Error
