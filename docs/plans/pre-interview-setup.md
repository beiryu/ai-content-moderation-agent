# Kế hoạch triển khai: Pre-Interview Setup Modal

**Phạm vi:** Màn hình chuẩn bị trước khi bắt đầu interview session — xem lại thông tin interview và nhập **ghi chú context** cho buổi đó; context chữ được inject vào `AnswerCoach`.

---

## 1. Mục tiêu sản phẩm

- Trước khi bắt đầu interview, người dùng có thể **xem lại thông tin interview** (job title, company, type) và **bổ sung ghi chú context** riêng cho buổi đó.
- `AnswerCoach` agent **nhận context** (job info + ghi chú buổi) trong instructions.
- Session **không tự động tạo** khi mount component; chỉ tạo sau khi người dùng bấm "Bắt đầu phỏng vấn".

---

## 2. Hiện trạng (baseline)

| Thành phần                                             | Hành vi hiện tại                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `LiveInterviewPlaygroundV2`                            | Gọi `createSession({ interviewId })` ngay trong `useEffect` khi mount, không có màn setup trung gian.        |
| `createSession` API (`POST /api/interview-sessions`)   | Chỉ nhận `interviewId`, không lưu `sessionContext`.                                                          |
| `AnswerCoach` agent (`lib/agents/interview-agents.ts`) | Instructions **hardcode**, không có thông tin job title, company, hay ghi chú buổi.                          |
| `analyzeMessage` trong store                           | Gửi `{ text, agentHistory, context }` lên `/api/assistant/question` — không có session context.              |
| `InterviewSession` schema                              | Không có field `sessionContext`.                                                                             |
| `GET /api/interviews/[interviewId]`                    | Đã tồn tại, trả về đầy đủ `jobTitle`, `companyName`, `type`, `notes`.                                        |
| RAG / `StreamingChat`                                  | `useChatDocumentStore.selectedDocuments` — **ngoài phạm vi** modal này; user chọn doc khi đã vào playground. |

**Kết luận:** Agent không biết đang phỏng vấn cho vị trí / công ty nào; modal chỉ bổ sung **text context** cho AnswerCoach.

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
   │    <textarea sessionContext>       │
   │                                    │
   │      [Bỏ qua]  [Bắt đầu ▶]        │
   └────────────────────────────────────┘
            │
            ▼ (createSession)
  [LiveInterviewPlaygroundV2 - full layout]
```

## 4. Thay đổi schema

### 4.1 Prisma schema

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

---

## 5. Phân chia phase

### Phase A — Core flow (bắt buộc)

| #   | Việc                  | File thay đổi                                              | Ghi chú                                                                           |
| --- | --------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A1  | **Schema migration**  | `prisma/schema.prisma`, `prisma/migrations/`               | Thêm `sessionContext` vào `InterviewSession`                                      |
| A2  | **Validation schema** | `lib/validations/interview-session.ts`                     | Thêm `sessionContext` (optional string) vào `CreateInterviewSessionRequestSchema` |
| A3  | **API tạo session**   | `app/api/interview-sessions/route.ts`                      | Lưu `sessionContext` vào DB                                                       |
| A4  | **Component modal**   | `components/pre-interview-setup-modal.tsx`                 | Mới — interview info (readonly) + textarea                                        |
| A5  | **Playground gate**   | `components/live-interview-playground-v2.tsx`              | State `isSetupDone`; chỉ `createSession` + timer sau khi đóng modal               |
| A6  | **Hook**              | `hooks/api/interview-session/useCreateInterviewSession.ts` | Type payload có `sessionContext?`                                                 |

### Phase B — Context injection vào AI (AnswerCoach)

| #   | Việc                          | File thay đổi                         | Ghi chú                                                                   |
| --- | ----------------------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| B1  | **Store: lưu sessionContext** | `stores/interview-session.store.ts`   | Object `{ jobTitle?, companyName?, interviewType?, userNotes? }` + setter |
| B2  | **Store: truyền context**     | `stores/interview-session.store.ts`   | `analyzeMessage` gửi `sessionContext` trong body                          |
| B3  | **API question route**        | `app/api/assistant/question/route.ts` | Nhận payload, `createAnswerCoachAgent(sessionContext)`                    |
| B4  | **Agent factory**             | `lib/agents/interview-agents.ts`      | `createAnswerCoachAgent`                                                  |

### Phase C — Polish

| #   | Việc                                   | Ghi chú                                     |
| --- | -------------------------------------- | ------------------------------------------- |
| C1  | Autofill textarea từ `Interview.notes` | Prefill `sessionContext` nếu `notes` có sẵn |

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
  sessionContext: string          ← textarea

onStart:
  onStart({ sessionContext })

Render:
  <Dialog>
    Section 1: Interview info (readonly)
    Section 2: sessionContext textarea
    Footer: [Bỏ qua] [Bắt đầu ▶]
  </Dialog>
```

> **Lưu ý UX:** "Bỏ qua" → `sessionContext = ""`.

---

### `components/live-interview-playground-v2.tsx` (sửa)

```ts
const [isSetupDone, setIsSetupDone] = useState(false)
const setupDataRef = useRef<{ sessionContext: string } | null>(null)
```

Sau khi user hoàn tất modal, `createSession({ interviewId, sessionContext })` rồi `resetTimer()`.

---

### `lib/agents/interview-agents.ts` (sửa)

`createAnswerCoachAgent(sessionContext?: { jobTitle?, companyName?, interviewType?, userNotes? })`.

`buildSessionContextBlock` ví dụ:

```
SESSION CONTEXT:
- Position: Software Engineer at Acme Corp (Technical Interview)
- Candidate notes: "Đây là vòng 2, tập trung vào distributed systems"

Use this when tailoring suggested answers.
```

---

### `app/api/assistant/question/route.ts` & `stores/interview-session.store.ts`

Nhận / gửi `sessionContext` object như trên.

---

## 8. File code tham chiếu

- `components/live-interview-playground-v2.tsx`
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
- [ ] Bấm "Bắt đầu" → session tạo kèm `sessionContext` (DB) → timer + layout.
- [ ] Bấm "Bỏ qua" → session với `sessionContext` rỗng, flow vẫn chạy.
- [ ] `AnswerCoach` nhận block context chữ (job + notes buổi).
- [ ] `sessionContext` lưu DB.
- [ ] Leave session: clear store context, không lẫn interview sau.
