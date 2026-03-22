# Kế hoạch triển khai: Pre-Interview Setup Modal

**Phạm vi:** Màn hình chuẩn bị trước khi bắt đầu interview session — xem lại thông tin interview, nhập **ghi chú context** cho buổi đó, và **chọn tài liệu** dùng cho RAG — context chữ được inject vào `AnswerCoach`; tài liệu được dùng làm **phạm vi file_search** cho panel chat bên phải.

---

## 1. Mục tiêu sản phẩm

- Trước khi bắt đầu interview, người dùng có thể **xem lại thông tin interview** (job title, company, type) và **bổ sung ghi chú context** riêng cho buổi đó (free text).
- Người dùng có thể **chọn một hoặc nhiều document đã upload** trong modal — selection được ghi vào `useChatDocumentStore` trước khi vào playground để **RAG chat** (cột phải) chỉ tìm trong các file đã chọn (giống chọn doc trong lúc phỏng vấn, nhưng làm sớm hơn).
- `AnswerCoach` agent **nhận context chữ** (job info + ghi chú buổi) trong instructions; **không** tự động đọc nội dung file trong phase đầu (xem §3.3 nếu muốn mở rộng sau).
- Session **không tự động tạo** khi mount component; chỉ tạo sau khi người dùng bấm "Bắt đầu phỏng vấn".

---

## 2. Hiện trạng (baseline)

| Thành phần | Hành vi hiện tại |
|---|---|
| `LiveInterviewPlaygroundV2` | Gọi `createSession({ interviewId })` ngay trong `useEffect` khi mount, không có màn setup trung gian. |
| `createSession` API (`POST /api/interview-sessions`) | Chỉ nhận `interviewId`, không lưu `sessionContext`. |
| `AnswerCoach` agent (`lib/agents/interview-agents.ts`) | Instructions **hardcode**, không có thông tin job title, company, hay ghi chú buổi. |
| `analyzeMessage` trong store | Gửi `{ text, agentHistory, context }` lên `/api/assistant/question` — không có session context. |
| `InterviewSession` schema | Không có field `sessionContext`. |
| `GET /api/interviews/[interviewId]` | Đã tồn tại, trả về đầy đủ `jobTitle`, `companyName`, `type`, `notes`. |
| RAG / `StreamingChat` | Dùng `useChatDocumentStore.selectedDocuments` để filter `file_search`; user thường chọn doc **trong** lúc phỏng vấn. |

**Kết luận:** Agent không biết đang phỏng vấn cho vị trí / công ty nào; tài liệu có thể được chọn sớm trong modal để không phải mở drawer ngay khi vào phòng.

---

## 3. Thiết kế UX

### 3.1 Flow mới

```
User vào /dashboard/interviews/[id]
            │
            ▼
  [PreInterviewSetupModal]
   ┌────────────────────────────────────┐
   │  📋 Thông tin phỏng vấn (readonly) │
   │    • Job Title / Company           │
   │    • Interview Type / Due Date     │
   │    • Notes từ interview (readonly) │
   │                                    │
   │  📝 Ghi chú cho buổi này           │
   │    <textarea sessionContext>        │
   │                                    │
   │  📎 Tài liệu cho buổi này (RAG)    │
   │    [DocumentSelector hoặc list]    │
   │    Chọn CV, JD, ghi chú công ty…   │
   │                                    │
   │      [Bỏ qua]  [Bắt đầu ▶]        │
   └────────────────────────────────────
            │
            ▼ (set selectedDocuments + createSession)
  [LiveInterviewPlaygroundV2 - full layout]
```

### 3.2 Tài liệu trong pre-interview — hoạt động thế nào?

| Câu hỏi | Trả lời |
|--------|--------|
| Có thể thêm document vào context pre-interview không? | **Có.** Trong modal, tái sử dụng UI chọn document (cùng nguồn dữ liệu với `DocumentSelector` / danh sách doc của user). |
| Document đó dùng cho phần nào? | **Chủ yếu RAG** (`POST /api/chat/rag/stream` + `StreamingChat`): `selectedDocuments` đã được set **trước** khi render playground → cột phải đã giới hạn nguồn ngay từ đầu. |
| AnswerCoach có đọc file không? | **Phase đầu:** không bắt buộc — AnswerCoach chỉ nhận **text** (job + `sessionContext`). User có thể tóm tắt JD trong textarea nếu muốn model gợi ý theo JD mà không cần retrieval. |
| Có cần lưu `documentIds` vào DB? | **Tùy chọn:** chỉ cần Zustand là đủ cho UX. Nếu cần audit / replay session, có thể thêm `selectedDocumentIds String[]` trên `InterviewSession` (backlog). |

### 3.3 Mở rộng sau (không trong scope phase 1)

- **RAG snippets vào AnswerCoach:** gọi retrieval ngắn (hoặc tóm tắt doc) và prepend vào prompt — tăng chi phí và độ phức tạp; để backlog.
- **Auto-gợi ý doc** theo `jobTitle` / type (heuristic) — backlog.

---

## 4. Thay đổi schema

### 4.1 Prisma schema

Chỉ thêm **ghi chú buổi** (text). Không thêm `focusAreas`.

```prisma
model InterviewSession {
  // ... existing fields ...
  sessionContext String?  @db.Text  // Ghi chú người dùng nhập trước khi bắt đầu
}
```

### 4.2 Migration

```sql
ALTER TABLE "interview_sessions"
  ADD COLUMN "session_context" TEXT;
```

**Tùy chọn (backlog):** `selected_document_ids TEXT[]` nếu muốn persist selection theo session.

---

## 5. Phân chia phase

### Phase A — Core flow (bắt buộc)

| # | Việc | File thay đổi | Ghi chú |
|---|------|---------------|---------|
| A1 | **Schema migration** | `prisma/schema.prisma`, `prisma/migrations/` | Thêm `sessionContext` vào `InterviewSession` |
| A2 | **Validation schema** | `lib/validations/interview-session.ts` | Thêm `sessionContext` (optional string) vào `CreateInterviewSessionRequestSchema` |
| A3 | **API tạo session** | `app/api/interview-sessions/route.ts` | Lưu `sessionContext` vào DB |
| A4 | **Component modal** | `components/pre-interview-setup-modal.tsx` | Mới — interview info + textarea + **document picker** |
| A5 | **Playground gate** | `components/live-interview-playground-v2.tsx` | `isSetupDone`; trước khi mount playground: gọi `setSelectedDocuments` / toggle từ kết quả modal (hoặc modal gọi store trực tiếp khi bấm Bắt đầu) |
| A6 | **Hook** | `hooks/api/interview-session/useCreateInterviewSession.ts` | Type payload có `sessionContext?` |

### Phase B — Context injection vào AI (AnswerCoach)

| # | Việc | File thay đổi | Ghi chú |
|---|------|---------------|---------|
| B1 | **Store: lưu sessionContext** | `stores/interview-session.store.ts` | Object `{ jobTitle?, companyName?, interviewType?, userNotes? }` + setter |
| B2 | **Store: truyền context** | `stores/interview-session.store.ts` | `analyzeMessage` gửi `sessionContext` trong body |
| B3 | **API question route** | `app/api/assistant/question/route.ts` | Nhận payload, `createAnswerCoachAgent(sessionContext)` |
| B4 | **Agent factory** | `lib/agents/interview-agents.ts` | `createAnswerCoachAgent` — **không** có `focusAreas` |

### Phase C — Polish

| # | Việc | Ghi chú |
|---|------|---------|
| C1 | Autofill textarea từ `Interview.notes` | Prefill `sessionContext` nếu `notes` có sẵn |
| C2 | Hiển thị nhẹ trong header playground | Ví dụ: "Đã chọn N tài liệu" hoặc tên doc đã chọn |
| C3 | Persist `selectedDocumentIds` trên `InterviewSession` | Nếu cần lịch sử theo session |

---

## 6. Chi tiết từng file

### `components/pre-interview-setup-modal.tsx` (mới)

```
Props:
  interviewId: string
  onStart: (data: { sessionContext: string }) => void
  onSkip: () => void

Internal state:
  interview: Interview | null   ← GET /api/interviews/[id]
  sessionContext: string        ← textarea
  // documents: dùng useChatDocumentStore — toggleDocument trong modal HOẶC local state rồi commit vào store trong onStart

onStart:
  - (optional) set selectedDocuments trong useChatDocumentStore từ state local
  - gọi onStart({ sessionContext })

Render:
  <Dialog>
    Section 1: Interview info (readonly)
    Section 2: sessionContext textarea
    Section 3: Document list / DocumentSelector (scroll, multi-select)
    Footer: [Bỏ qua] [Bắt đầu ▶]
  </Dialog>
```

> **Lưu ý UX:** "Bỏ qua" → `sessionContext = ""`, có thể `clearDocumentSelection()` hoặc giữ nguyên tùy product (khuyến nghị: clear khi Bỏ qua để giống “không setup”).

---

### `components/live-interview-playground-v2.tsx` (sửa)

```ts
const [isSetupDone, setIsSetupDone] = useState(false)
const setupDataRef = useRef<{ sessionContext: string } | null>(null)
```

Sau khi user hoàn tất modal, `createSession({ interviewId, sessionContext })` rồi `resetTimer()`.

---

### `lib/agents/interview-agents.ts` (sửa)

`createAnswerCoachAgent(sessionContext?: { jobTitle?, companyName?, interviewType?, userNotes? })` — block text **không** nhắc tới focus areas.

`buildSessionContextBlock` ví dụ:

```
SESSION CONTEXT:
- Position: Software Engineer at Acme Corp (Technical Interview)
- Candidate notes: "Đây là vòng 2, tập trung vào distributed systems"

Use this when tailoring suggested answers.
```

---

### `app/api/assistant/question/route.ts` & `stores/interview-session.store.ts`

Giống plan cũ nhưng **bỏ mọi field `focusAreas`**.

---

## 7. Rủi ro & quyết định

| Rủi ro | Quyết định |
|--------|-----------|
| Document chưa có `openaiFileId` | Giữ hành vi hiện tại RAG (filter / toast "chưa sẵn sàng") — có thể disable chọn hoặc cảnh báo trong modal |
| Trùng logic với drawer doc trong playground | Extract list chọn doc thành component dùng chung (`DocumentSelector` hoặc wrapper) — align với `docs/plans/live-interview-rag.md` |
| User mong AnswerCoach “đọc” JD chỉ vì đã chọn file | Làm rõ trong UI: tài liệu phục vụ **ô chat RAG**; gợi ý trả lời dùng **ghi chú** + thông tin job; hoặc làm phase retrieval sau |

---

## 8. File code tham chiếu

- `components/live-interview-playground-v2.tsx`
- `components/chat/document-selector.tsx` — tái sử dụng / embed trong modal
- `stores/chat-document-store.ts` — `selectedDocuments`, `toggleDocument`
- `lib/agents/interview-agents.ts`
- `app/api/assistant/question/route.ts`
- `stores/interview-session.store.ts`
- `lib/validations/interview-session.ts`
- `app/api/interview-sessions/route.ts`
- `app/api/interviews/[interviewId]/route.ts`
- `prisma/schema.prisma`

---

## 9. Definition of Done

- [ ] Modal setup hiển thị trước layout phỏng vấn.
- [ ] Hiển thị `jobTitle`, `companyName`, `type` từ Interview.
- [ ] Người dùng nhập được `sessionContext` (optional).
- [ ] Người dùng **chọn được document** trong modal; sau khi vào playground, RAG dùng đúng `selectedDocuments` (cột phải).
- [ ] Bấm "Bắt đầu" → session tạo kèm `sessionContext` (DB) → timer + layout.
- [ ] Bấm "Bỏ qua" → session không bắt buộc ghi chú; hành vi document rõ ràng (clear hoặc documented).
- [ ] `AnswerCoach` nhận block context chữ (job + notes buổi).
- [ ] `sessionContext` lưu DB; không còn yêu cầu focus areas.
- [ ] Leave session: clear store context, không lẫn interview sau.
