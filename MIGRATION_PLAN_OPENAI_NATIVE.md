# Migration Plan: Manual RAG → OpenAI Native File Search

## Tổng quan

Migrate từ custom RAG pipeline (LangChain + Pinecone + embeddings thủ công) sang
OpenAI native **File Search** tool trong **Responses API**.

---

## I. Phân tích kiến trúc hiện tại

### Luồng xử lý hiện tại

```
UPLOAD DOCUMENT
─────────────────────────────────────────────────────────────
Browser → POST /api/documents
  → loadDocumentFromBuffer()         [lib/langchain/document-loaders.ts]
  → splitDocuments()                  [lib/langchain/text-splitter.ts]
     └─ RecursiveCharacterTextSplitter (chunkSize: 256, overlap: 20)
  → processDocumentRAG() per chunk   [lib/langchain/rag-pipeline.ts]
     └─ getEmbeddingModel()           [lib/langchain/embedding.ts]
        └─ text-embedding-3-large (1536 dims)
     └─ getPineconeStore()            [lib/langchain/vector-store.ts]
        └─ upsert to Pinecone index (filter: userId + documentId)
  → save DocumentChunk records       [Prisma: document_chunks]

STREAMING CHAT
─────────────────────────────────────────────────────────────
Browser → POST /api/chat/rag/stream
  → executeRAGPipelineStream()        [lib/langchain/rag-pipeline-stream.ts]
     └─ createMemoryWithHistory()     [lib/langchain/memory.ts]
        └─ Redis (Upstash) ← primary
        └─ Prisma DB ← fallback
     └─ searchSimilarDocuments()      [lib/langchain/vector-store.ts]
        └─ Pinecone similarity search (filter: userId + documentIds)
        └─ topK: 5 (×N nếu nhiều doc)
     └─ RunnableSequence (LangChain)
        └─ ragPromptTemplate + context injected
        └─ streamingLlm (gpt-4o-mini)
  → saveChatInteraction()             [lib/langchain/memory.ts]
     └─ save to Prisma: chat_messages
  → SSE stream → Browser

DELETE DOCUMENT
─────────────────────────────────────────────────────────────
DELETE /api/documents/[id]
  → deleteDocumentsFromPinecone(chunkIds)
  → delete DocumentChunk (Prisma)
  → delete Document (Prisma)
```

### Các thành phần cần thay thế

| File                                   | Vai trò hiện tại        | Sau migration                   |
| -------------------------------------- | ----------------------- | ------------------------------- |
| `lib/langchain/embedding.ts`           | Tạo embeddings thủ công | **XÓA** — OpenAI tự embed       |
| `lib/langchain/vector-store.ts`        | Pinecone CRUD           | **XÓA** — OpenAI Vector Store   |
| `lib/langchain/text-splitter.ts`       | Chunking thủ công       | **XÓA** — OpenAI tự chunk       |
| `lib/langchain/document-loaders.ts`    | Load buffer → Document  | **XÓA** — gửi raw file          |
| `lib/langchain/rag-pipeline.ts`        | RAG chain (non-stream)  | **XÓA**                         |
| `lib/langchain/rag-pipeline-stream.ts` | RAG chain (stream)      | **THAY THẾ** bằng Responses API |
| `lib/langchain/memory.ts`              | Redis + Prisma memory   | **GIỮ** (chỉ refactor nhẹ)      |
| `config/rag.ts`                        | Cấu hình RAG            | **CẬP NHẬT**                    |
| `app/api/documents/route.ts`           | Upload + embed          | **THAY THẾ**                    |
| `app/api/documents/[id]/route.ts`      | CRUD + delete Pinecone  | **THAY THẾ**                    |
| `app/api/chat/rag/stream/route.ts`     | Streaming RAG           | **THAY THẾ**                    |

### Các thành phần GIỮ NGUYÊN

- `lib/langchain/memory.ts` — giữ Redis + Prisma conversation history
- `prisma/schema.prisma` — thêm 2 field mới, giữ tất cả model còn lại
- `components/chat/` — thay đổi nhỏ ở citation format
- `hooks/api/chat/` — giữ nguyên interface, chỉ cập nhật `Source` type
- `stores/chat-document-store.ts` — giữ nguyên
- `lib/validations/` — thay đổi nhỏ

---

## II. Kiến trúc mới

### Luồng xử lý sau migration

```
UPLOAD DOCUMENT (mới)
─────────────────────────────────────────────────────────────
Browser → POST /api/documents
  → upload file → openai.files.create()          [Files API]
  → get/create user Vector Store                 [lib/openai/vector-store-service.ts]
     └─ 1 vector store duy nhất per user
     └─ lưu vectorStoreId vào User (DB)
  → openai.beta.vectorStores.files.create()      [link file to store]
     └─ thêm metadata: { documentId, userId, documentType }
  → save Document record + openaiFileId          [Prisma]
  (KHÔNG còn DocumentChunk, embedding, Pinecone)

STREAMING CHAT (mới)
─────────────────────────────────────────────────────────────
Browser → POST /api/chat/rag/stream
  → load conversation history from Prisma/Redis  [lib/langchain/memory.ts]
  → openai.responses.stream({                    [lib/openai/file-search-stream.ts]
       model: "gpt-4o",
       tools: [{ type: "file_search",
                 vector_store_ids: [userVectorStoreId],
                 filters: { documentId: { $in: selectedDocumentIds } }
               }],
       input: [...history, { role: "user", content: query }]
     })
  → stream chunks → SSE → Browser
  → save to Prisma: chat_messages

DELETE DOCUMENT (mới)
─────────────────────────────────────────────────────────────
DELETE /api/documents/[id]
  → openai.beta.vectorStores.files.del(vectorStoreId, fileId)
  → openai.files.del(fileId)
  → delete Document (Prisma) — cascade xóa luôn
```

### Service layer mới

```
lib/openai/
  ├── client.ts                  # OpenAI singleton (đã có tại lib/openai.ts)
  ├── vector-store-service.ts    # CRUD Vector Store per user
  └── file-search-stream.ts      # Streaming Responses API với file_search
```

---

## III. Migration Plan Chi Tiết

### Phase 1: Database Schema + Env (không breaking)

**Mục tiêu:** Thêm field mới vào DB, không ảnh hưởng code hiện tại.

#### 1.1. Cập nhật Prisma Schema

```prisma
// Thêm vào model User
model User {
  // ... existing fields ...
  openaiVectorStoreId  String?  @map("openai_vector_store_id")
}

// Thêm vào model Document
model Document {
  // ... existing fields ...
  openaiFileId         String?  @map("openai_file_id")
}
```

#### 1.2. Chạy migration

```bash
pnpm prisma migrate dev --name add_openai_native_fields
```

#### 1.3. Cập nhật env.mjs

Không cần thêm env var mới — `OPENAI_API_KEY` đã có.
Có thể add env vars để toggle migration:

```bash
# .env.local
OPENAI_VECTOR_STORE_ENABLED=true   # feature flag khi migrate dần
```

---

### Phase 2: Service Layer mới

**Tạo `lib/openai/vector-store-service.ts`**

Quản lý Vector Store per user:

- `getOrCreateVectorStore(userId)` — lấy hoặc tạo mới, lưu vào DB
- `addFileToVectorStore(vectorStoreId, fileId, metadata)` — link file vào store
- `removeFileFromVectorStore(vectorStoreId, fileId)` — unlink
- `getVectorStoreFiles(vectorStoreId, filters)` — list files

**Tạo `lib/openai/file-search-stream.ts`**

Streaming wrapper cho Responses API:

- `streamWithFileSearch(options)` — gọi `openai.responses.stream()`
  - Input: `{ messages, vectorStoreId, selectedFileIds, systemPrompt }`
  - Output: async generator yield `{ content, citations }`
- Citation format từ OpenAI: `file_citation` annotation trong response content

---

### Phase 3: Migrate Document Upload API

**Cập nhật `app/api/documents/route.ts` (POST)**

Thay thế pipeline:

```
TRƯỚC: buffer → LangChain loader → text splitter → embed → Pinecone
SAU:   buffer/file → OpenAI Files API → Vector Store link
```

Hỗ trợ thêm file types: `.pdf`, `.docx`, `.md`, `.txt` (OpenAI hỗ trợ tất cả)

**Cập nhật `app/api/documents/[id]/route.ts` (DELETE)**

```
TRƯỚC: deleteDocumentsFromPinecone(chunkIds) → xóa DocumentChunk → xóa Document
SAU:   vectorStores.files.del(fileId) → files.del(fileId) → xóa Document
```

---

### Phase 4: Migrate Streaming Chat

**Cập nhật `app/api/chat/rag/stream/route.ts`**

```
TRƯỚC: executeRAGPipelineStream() [LangChain + Pinecone]
SAU:   streamWithFileSearch() [OpenAI Responses API]
```

Giữ nguyên:

- SSE response format (`{ type: "content" }` và `{ type: "complete" }`)
- Memory load/save via `lib/langchain/memory.ts`
- Request validation via `RagChatRequestSchema`

**Cập nhật `Source` type trong `hooks/api/chat/useRagChatMessages.ts`**

OpenAI trả về citation format khác:

```typescript
// TRƯỚC
interface Source {
  documentId: string
  documentTitle: string
  content: string
  score?: number
  chunkId?: string
}

// SAU
interface Source {
  documentId: string
  documentTitle: string
  quote: string // text được trích dẫn thực tế
  fileId: string // OpenAI file ID
}
```

---

### Phase 5: Cleanup (sau khi verify hoạt động)

**Xóa các file không còn dùng:**

```
lib/langchain/embedding.ts
lib/langchain/vector-store.ts
lib/langchain/text-splitter.ts
lib/langchain/document-loaders.ts
lib/langchain/rag-pipeline.ts
lib/langchain/rag-pipeline-stream.ts
```

**Giữ lại:**

```
lib/langchain/memory.ts       # conversation memory
lib/langchain/index.ts        # cập nhật exports
```

**Xóa dependencies (package.json):**

```bash
pnpm remove @langchain/pinecone @pinecone-database/pinecone
pnpm remove @langchain/textsplitters
# Giữ: @langchain/core @langchain/openai langchain (cho memory)
```

**Cập nhật `config/rag.ts`:**

- Xóa `vectorDb` section (Pinecone config)
- Xóa `chunking` section
- Xóa `embedding` section
- Giữ `models.chat`, `models.memory`, `prompts`

**Xóa biến môi trường (sau khi cleanup):**

```bash
# Có thể xóa khỏi .env.local
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
PINECONE_NAMESPACE=
```

---

### Phase 6: Frontend Updates

**`lib/file-upload.ts`** — mở rộng supported file types:

```typescript
// TRƯỚC: chỉ .txt
const SUPPORTED_TYPES = ['text/plain']

// SAU: thêm PDF, DOCX, Markdown
const SUPPORTED_TYPES = ['text/plain', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown']
```

**`components/chat/chat-message.tsx`** — cập nhật `SourceBadge` để hiển thị `quote` thay vì `content` snippet + score.

---

## IV. Rủi ro & Mitigation

| Rủi ro                                                   | Mức độ     | Mitigation                                                  |
| -------------------------------------------------------- | ---------- | ----------------------------------------------------------- |
| Documents hiện tại đã lưu Pinecone sẽ mất                | Cao        | Phase 3 thêm script re-upload existing documents lên OpenAI |
| OpenAI File Search chậm hơn Pinecone khi filter phức tạp | Trung bình | Test latency trước khi cutover                              |
| Redis memory vẫn cần (conversation history)              | Thấp       | Giữ nguyên, không ảnh hưởng                                 |
| OpenAI vector store $0.10/GB/day khi scale               | Thấp       | Ở scale hiện tại (CV/JD vài MB) = $0 (free 1GB)             |
| Breaking change ở `Source` type                          | Trung bình | Cập nhật `chat-message.tsx` cùng lúc với API                |

---

## V. Timeline ước tính

```
Phase 1 — DB Schema         │ ~1 giờ   │ Low risk, không breaking
Phase 2 — Service Layer     │ ~3 giờ   │ New code, không ảnh hưởng
Phase 3 — Document Upload   │ ~2 giờ   │ Medium risk
Phase 4 — Streaming Chat    │ ~3 giờ   │ Highest risk, test kỹ
Phase 5 — Cleanup           │ ~1 giờ   │ Sau khi verify
Phase 6 — Frontend          │ ~2 giờ   │ Low risk
─────────────────────────────────────────
Total                       │ ~12 giờ  │
```

---

## VI. Tóm tắt Dependencies thay đổi

```json
// REMOVE
"@langchain/pinecone": "...",
"@pinecone-database/pinecone": "...",
"@langchain/textsplitters": "...",

// KEEP (dùng cho memory)
"@langchain/core": "...",
"@langchain/openai": "...",
"langchain": "...",
"@langchain/community": "...",   // upstash redis store

// ALREADY HAVE (dùng cho Responses API)
"openai": "..."
```

---

## VII. Quyết định: Migrate hay Giữ?

**Nên migrate nếu:**

- Muốn support PDF/DOCX upload (hiện chỉ có .txt)
- Muốn bỏ Pinecone account dependency
- Muốn đơn giản hóa codebase (~400 LOC xóa)
- Scale document nhỏ (< 1GB, trong free tier OpenAI)

**Nên giữ nếu:**

- Cần control chính xác chunking strategy
- Cần custom scoring/ranking logic
- Plan dùng multiple LLM providers (không lock-in OpenAI)
- Cần offline/self-hosted option trong tương lai

**Recommendation:** Migrate — use case interview prep document (CV, JD vài KB-MB)
là perfect fit cho OpenAI native, và được ngay lợi ích PDF support + bỏ Pinecone.
