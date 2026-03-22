# Implementation Plan: OpenAI Agents SDK — AI Interview Flow

## Mục tiêu

Refactor hệ thống AI phân tích phỏng vấn hiện tại từ một single raw `openai.chat.completions.create` call thành một **single agent** (`AnswerCoach`) có context memory đúng nghĩa, dùng `@openai/agents` (TypeScript SDK). Mục tiêu: rẻ hơn, nhanh hơn, chính xác hơn, context-aware hơn.

---

## Trạng thái hiện tại (cần nắm rõ trước khi làm)

### Vấn đề cốt lõi

1. **`app/api/assistant/analyze-message/route.ts`** — single `openai.chat.completions.create` call, inject last 6 messages dưới dạng plain string vào system prompt. Không có agent orchestration, không có session memory thực sự.

2. **`stores/interview-session.store.ts`** — `analyzeMessage()` tự tay slice 6 messages, format thành string, POST lên API. Memory chỉ sống trong RAM của tab trình duyệt.

3. **`types/interview-message.ts`** — `AnswerAnalysis` interface được định nghĩa nhưng **không bao giờ được dùng** (`answerAnalysis` luôn là `null`). `MessageType` luôn là `"other"`.

4. **`config/rag.ts`** — `RAG_CONFIG.models.chat.analysis` đang là `"gpt-3.5-turbo-1106"` (deprecated). Cần nâng lên `gpt-4o-mini`.

5. **Context window** — hardcode lấy 6 messages cuối, không có cơ chế compression khi conversation dài.

### Files quan trọng

```
app/api/assistant/analyze-message/route.ts  ← sẽ bị thay thế
stores/interview-session.store.ts           ← sẽ được refactor
types/interview-message.ts                  ← sẽ được dọn dẹp
config/rag.ts                               ← sẽ update model name
components/live-interview-playground-v2.tsx ← không thay đổi
components/live-interview-responses.tsx     ← không thay đổi
hooks/use-deepgram-connection.ts            ← không thay đổi
```

---

## Architecture mới

### Flow tổng quan

```
[Interviewer nói] → Deepgram → interviewerBuffer (final transcript)
        ↓
flushTranscript("interviewer") trong store
        ↓
analyzeMessage(messageId) trong store
        ↓
POST /api/assistant/question
  body: { text: string, agentHistory: AgentInputItem[] }
        ↓
┌─────────────────────────────────────────┐
│  AnswerCoachAgent (gpt-4o-mini) — duy nhất│
│  • nhận interviewer transcript          │
│  • structured output: { question,         │
│    suggestedAnswer }                      │
└─────────────────────────────────────────┘
        ↓
response: { question: string, suggestedAnswer: string, updatedHistory: AgentInputItem[] }
        ↓
Zustand store update: messages + agentHistory
        ↓
LiveInterviewResponses renders cards
```

### Pattern: single agent

- **Chỉ một agent** — `AnswerCoach`: extract câu hỏi + gợi ý câu trả lời.

### Memory Strategy: 2 lớp

```
┌───────────────────────────────────────────────────────────┐
│  LAYER 1: MemorySession (server-side, per request)        │
│  • Tạo mới mỗi request, seed bằng agentHistory từ client │
│  • @openai/agents MemorySession({ initialItems })         │
│  • SDK tự lo prepend history vào mỗi turn                │
│  • Trả về history đã update sau mỗi turn                  │
│  • Wrapped bằng OpenAIResponsesCompactionSession để        │
│    tự compress khi > 12 items (tiết kiệm ~70% tokens)     │
├───────────────────────────────────────────────────────────┤
│  LAYER 2: Zustand + sessionStorage (client-side)          │
│  • agentHistory: AgentInputItem[] — persist trong         │
│    sessionStorage, không mất khi navigate nhưng mất       │
│    khi đóng tab/session mới                               │
│  • Zustand store dùng persist middleware với              │
│    storage: sessionStorage                                │
└───────────────────────────────────────────────────────────┘
```

**Tại sao không dùng `OpenAIConversationsSession`?**
`OpenAIConversationsSession` dùng `/v1/beta/conversations` endpoint — cần setup thêm, tốn thêm API cost. Client-managed history qua `MemorySession({ initialItems })` đơn giản hơn và không phụ thuộc thêm service nào.

---

## Các thay đổi cần thực hiện

### Phase 1 — Cài đặt dependency

```bash
pnpm add @openai/agents
```

Package `@openai/agents` là TypeScript SDK chính thức. Không cần thêm gì khác.

---

### Phase 2 — Dọn dẹp types

**File:** `types/interview-message.ts`

Bỏ hoàn toàn `AnswerAnalysis` interface (dead code, không bao giờ được dùng).

Bỏ `answerAnalysis` field trong `InterviewMessage`.

Giữ nguyên `QuestionAnalysis` vì component `LiveInterviewResponses` đang dùng `response.question` và `response.suggestedAnswer`.

**Kết quả sau khi sửa:**

```typescript
export type RoleType = "interviewer" | "candidate" | "ai" | "system"
export type MessageType =
  | "question"
  | "answer"
  | "feedback"
  | "suggestion"
  | "other"

export interface InterviewMessage {
  id: string
  role: RoleType
  content: string
  messageType: MessageType
  questionAnalysis: QuestionAnalysis | null
  createdAt: Date
  updatedAt: Date
  sessionId: string
}

export interface QuestionAnalysis {
  id: string
  question: string
  suggestedAnswer: string
  createdAt: Date
  updatedAt: Date
  messageId: string
}
```

---

### Phase 3 — Update model config

**File:** `config/rag.ts`

Thay `"gpt-3.5-turbo-1106"` thành `"gpt-4o-mini"`:

```typescript
models: {
  chat: {
    default: "gpt-4o-mini",
    interview: "gpt-4o-mini",   // đổi từ "gpt-3.5-turbo-1106"
    analysis: "gpt-4o-mini",    // đổi từ "gpt-3.5-turbo-1106"
    // ... giữ nguyên các field khác
  },
```

---

### Phase 4 — Tạo Agent definition

**File mới:** `lib/agents/interview-agents.ts`

Chỉ export **một** agent:

- **`answerCoachAgent`** — nhận interviewer's transcript (và history qua `MemorySession`), extract question, generate suggested answer.

  - Model: `gpt-4o-mini`
  - Output schema (Zod): `{ question: z.string(), suggestedAnswer: z.string() }`
  - Instructions: expert interview coach, extract core question, generate 1-3 sentence answer the candidate can say verbatim, concise and natural-sounding.
  - `outputType`: Zod schema để force structured output

**Route gọi trực tiếp:** `run(answerCoachAgent, text, { session })` — không có agent thứ hai.

**Ví dụ cấu trúc:**

```typescript
import { Agent } from "@openai/agents"
import { z } from "zod"

const QuestionOutputSchema = z.object({
  question: z
    .string()
    .describe("The core question extracted from the interviewer's statement"),
  suggestedAnswer: z
    .string()
    .describe(
      "A complete, natural-sounding answer the candidate can say verbatim"
    ),
})

export const answerCoachAgent = new Agent({
  name: "AnswerCoach",
  model: "gpt-4o-mini",
  instructions: `You are an expert interview coach. 
Given an interviewer's statement and conversation history:
1. Extract the core question being asked
2. Write a complete, confident, natural-sounding answer the candidate can say verbatim

The answer should be 1-3 sentences: directly address the question, include a concrete example or detail where relevant, and end cleanly.`,
  outputType: QuestionOutputSchema,
})
```

---

### Phase 5 — Tạo API route mới

**File mới:** `app/api/assistant/question/route.ts`

**File cũ:** `app/api/assistant/analyze-message/route.ts` — **giữ nguyên cho đến khi route mới hoạt động**, sau đó xóa.

Route mới nhận:

```typescript
// Request body
{
  text: string                    // interviewer's transcript
  agentHistory?: AgentInputItem[] // conversation history từ client (Layer 2)
}

// Response
{
  question: string
  suggestedAnswer: string
  updatedHistory: AgentInputItem[] // history sau khi agent chạy xong
}
```

Logic bên trong route:

1. Parse `text` và `agentHistory` từ request body
2. Import `AgentInputItem` type từ `@openai/agents-core`
3. Tạo `MemorySession({ initialItems: agentHistory ?? [] })`
4. Wrap bằng `OpenAIResponsesCompactionSession`:
   - `underlyingSession: memorySession`
   - `shouldTriggerCompaction: ({ compactionCandidateItems }) => compactionCandidateItems.length >= 12`
5. `const result = await run(answerCoachAgent, text, { session: compactionSession })`
6. Lấy `updatedHistory` từ `await compactionSession.getItems()` (hoặc underlying session)
7. Return `{ ...result.finalOutput, updatedHistory }`

**Error handling:** wrap trong try/catch, return 500 với message nếu lỗi.

**Import cần thiết:**

```typescript
import {
  MemorySession,
  OpenAIResponsesCompactionSession,
  run,
} from "@openai/agents"
import type { AgentInputItem } from "@openai/agents-core"

import { answerCoachAgent } from "@/lib/agents/interview-agents"
```

---

### Phase 6 — Refactor Zustand store

**File:** `stores/interview-session.store.ts`

**Thay đổi cần làm:**

1. **Thêm `agentHistory` state** — lưu conversation history cho agent:

   ```typescript
   agentHistory: AgentInputItem[]
   ```

2. **Thêm `persist` middleware** — persist `agentHistory` vào `sessionStorage`:

   ```typescript
   import { createJSONStorage, persist } from "zustand/middleware"

   // wrap store với persist, chỉ persist field `agentHistory`
   // storage: createJSONStorage(() => sessionStorage)
   // partialize: (state) => ({ agentHistory: state.agentHistory })
   ```

3. **Update `analyzeMessage()`** — thay vì POST đến `analyze-message`, POST đến `question`:

   - Gửi `{ text: message.content, agentHistory: state.agentHistory }`
   - Nhận về `{ question, suggestedAnswer, updatedHistory }`
   - Update `agentHistory` với `updatedHistory` từ response
   - Update message với `questionAnalysis` như hiện tại

4. **Bỏ logic slice 6 messages thủ công** — không cần nữa vì SDK lo.

5. **Bỏ `answerAnalysis: null`** trong `flushTranscript()` (sau khi đã sửa type ở Phase 2).

**Interface update:**

```typescript
interface InterviewSessionStore {
  // ... existing fields
  agentHistory: AgentInputItem[] // thêm mới
  setAgentHistory: (history: AgentInputItem[]) => void // thêm mới
  clearAgentHistory: () => void // thêm mới (dùng khi end session)
  // ... existing actions
}
```

**Khi nào reset `agentHistory`?** Khi `setCurrentSessionId(null)` được gọi (tức là khi user kết thúc interview session).

---

### Phase 7 — Xóa route cũ

Sau khi Phase 5 và 6 hoạt động ổn định:

- Xóa `app/api/assistant/analyze-message/route.ts`
- Xóa các import liên quan đến route cũ nếu còn sót

---

## Tổng kết các files cần thay đổi

| File                                         | Action                                                     | Ghi chú                                     |
| -------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| `package.json`                               | Thêm `@openai/agents`                                      | `pnpm add @openai/agents`                   |
| `types/interview-message.ts`                 | Bỏ `AnswerAnalysis`, bỏ `answerAnalysis` field             | Dead code cleanup                           |
| `config/rag.ts`                              | Đổi model sang `gpt-4o-mini`                               | `gpt-3.5-turbo-1106` deprecated             |
| `lib/agents/interview-agents.ts`             | **Tạo mới**                                                | Chỉ `answerCoachAgent` (không orchestrator) |
| `app/api/assistant/question/route.ts`        | **Tạo mới**                                                | Thay thế `analyze-message`                  |
| `stores/interview-session.store.ts`          | Refactor `analyzeMessage()`, thêm `agentHistory` + persist | Core logic change                           |
| `app/api/assistant/analyze-message/route.ts` | Xóa (sau khi route mới hoạt động)                          |                                             |

---

## Output schema cuối cùng

Chỉ giữ những gì cần thiết:

```typescript
// Zod schema trong lib/agents/interview-agents.ts
const QuestionOutputSchema = z.object({
  question: z.string(),
  suggestedAnswer: z.string(),
})
```

Map 1:1 với `QuestionAnalysis` interface (chỉ lấy `question` và `suggestedAnswer`). Các field như `id`, `createdAt`, `updatedAt`, `messageId` vẫn được stamp client-side trong store như hiện tại.

---

## Lưu ý quan trọng khi implement

1. **`@openai/agents` exports** — Import từ đúng package:

   - `run`, `Agent`, `MemorySession`, `OpenAIResponsesCompactionSession` → từ `"@openai/agents"`
   - `AgentInputItem` type → từ `"@openai/agents-core"`

2. **`OpenAIResponsesCompactionSession` + `MemorySession`** — Docs nói KHÔNG dùng `OpenAIResponsesCompactionSession` với `OpenAIConversationsSession`. Dùng với `MemorySession` là đúng.

3. **`openai` singleton** — Project đang dùng `lib/openai.ts` làm singleton client. Agents SDK tự tạo client riêng từ `OPENAI_API_KEY` env var — không cần truyền vào, chỉ cần env var đã set.

4. **`agentHistory` serialization** — `AgentInputItem[]` là plain JSON-serializable objects nên `JSON.stringify`/`JSON.parse` trong sessionStorage hoạt động bình thường.

5. **TypeScript types** — Sau khi bỏ `AnswerAnalysis` khỏi `types/interview-message.ts`, kiểm tra toàn bộ codebase xem có import `AnswerAnalysis` ở đâu không (dùng `grep -r "AnswerAnalysis"` hoặc ripgrep). Hiện tại không có component nào dùng field này.

6. **`zustand/middleware` `persist`** — Project đang dùng Zustand. `persist` middleware đã có sẵn trong `zustand/middleware`, không cần install thêm.

7. **Route path** — Route mới là `POST /api/assistant/question`. Update URL trong `analyzeMessage()` của store từ `"/api/assistant/analyze-message"` thành `"/api/assistant/question"`.

8. **Thứ tự implement** — Phải theo đúng thứ tự Phase 1 → 7 vì có dependency:
   - Phase 2 phải trước Phase 6 (type change ảnh hưởng store)
   - Phase 4 phải trước Phase 5 (agents định nghĩa trước khi route dùng)
   - Phase 5 phải trước Phase 6 (route mới phải ready trước khi store gọi)
   - Phase 7 là cuối cùng sau khi verify

---
