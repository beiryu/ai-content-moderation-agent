# Kế hoạch triển khai: RAG trong Live Interview

**Phạm vi:** Chỉ RAG chat gắn với màn **Live Interview** (`LiveInterviewPlaygroundV2`).  
**Ngoài phạm vi:** Export transcript, vector hóa transcript, mọi thay đổi schema/API liên quan transcript.

---

## 1. Mục tiêu sản phẩm

- Ứng viên trong buổi mock/live interview có thể **chọn tài liệu đã upload** (CV, JD, ghi chú công ty, …) và **hỏi đáp có trích dẫn** qua RAG trong cùng không gian làm việc.
- Trải nghiệm **không phụ thuộc** vào trang Chat tổng (`/dashboard/...` với `ChatWithDocuments`): người dùng không phải rời màn interview để chọn doc.

---

## 2. Hiện trạng (baseline)

| Thành phần                  | Hành vi                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `LiveInterviewPlaygroundV2` | Cột phải render `<StreamingChat />` — gọi `POST /api/chat/rag/stream`, dùng `useChatDocumentStore` (`selectedDocuments`, `activeSessionId`). |
| `ChatWithDocuments`         | Có đủ 3 vùng: sessions \| `StreamingChat` \| `DocumentSelector`.                                                                             |
| `StreamingChat`             | Copy UX nhắc “chọn tài liệu ở panel bên phải” — **đúng trên layout Chat, sai trên Live Interview** vì **không có** `DocumentSelector`.       |
| API RAG stream              | `file_search` **chỉ khi** `selectedDocuments` có ít nhất một id; rỗng = chat chung (không search vector store), xem `streamDocumentChatWithoutFileSearch`. |
| `ChatConversation`          | Tách biệt `InterviewSession`; `sessionId` trên URL (`?sessionId=`) là conversation chat, không gắn DB với `interviewId`.                     |

**Kết luận:** Backend RAG đủ cho live; **thiếu UI chọn tài liệu trong playground** và có thể thiếu **ràng buộc ngữ cảnh interview** (prompt / optional link `interviewId`).

---

## 3. Khoảng trống cần lấp

1. **Chọn tài liệu trong Live Interview** — ưu tiên P0.
2. **Copy & layout** — empty state / placeholder không được giả định “panel bên phải” khi embed trong interview.
3. **(Tùy chọn P1)** Gắn conversation với interview: metadata `interviewId` trên `ChatConversation`, hoặc tách store khi vào playground để không lẫn session chat dashboard.
4. **(Tùy chọn P1)** System prompt / instructions riêng khi `context=live_interview` (tránh trả lời kiểu “tài liệu chung”, ưu tiên JD của **interview hiện tại** nếu đã map được).
5. **Nút Paperclip** trong `StreamingChat` hiện không có handler — hoặc wire tới chọn doc, hoặc ẩn trên interview để tránh nhầm.

**Không làm trong plan này:** export transcript, thêm `DocumentType.TRSCRIPT` flow, `export-transcript` API.

---

## 4. Phân chia phase

### Phase A — UX tối thiểu (bắt buộc)

| #   | Việc                                                           | Gợi ý kỹ thuật                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Đưa **document selection** vào màn live interview              | Ví dụ: `Sheet` / `Drawer` / `Popover` từ header “RAG Chat” chứa `DocumentSelector` (extract phần list + toggle từ `document-selector.tsx` thành component dùng chung), **hoặc** thêm cột/panel nhỏ trong `ResizablePanelGroup` (cân nhắc `minSize` để không chật 3 cột sẵn có). |
| A2  | Điều chỉnh **empty state & placeholder** trong `StreamingChat` | Thêm prop `variant?: "standalone" \| "embedded"` (hoặc `showDocumentHint`) để copy đúng: embedded → “Mở [Chọn tài liệu] để giới hạn nguồn RAG” thay vì “panel bên phải”.                                                                                                        |
| A3  | **Kiểm thử thủ công**                                          | Upload doc → sync `openaiFileId` → vào live interview → chọn doc → hỏi → có citation / filter đúng.                                                                                                                                                                             |

### Phase B — Gắn với interview (khuyến nghị)

| #   | Việc                                                                                                | Gợi ý kỹ thuật                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | Truyền `interviewId` từ `LiveInterviewPlaygroundV2` xuống wrapper RAG (vd. `LiveInterviewRagPanel`) | Khi tạo conversation đầu tiên, lưu metadata (cần migration: `ChatConversation.interviewId` optional, hoặc field JSON `metadata`) để sau này filter/lọc lịch sử theo interview. |
| B2  | **Reset hoặc namespace store** khi `interviewId` đổi                                                | Tránh dùng nhầm `selectedDocuments` / `activeSessionId` từ lần vào interview trước: `useEffect` clear hoặc key zustand theo route.                                             |
| B3  | **Auto-gợi ý chọn doc** (optional)                                                                  | Prefill `selectedDocuments` với doc có `metadata` hoặc type JD/RESUME khớp `Interview.jobTitle` / heuristic đơn giản (sau khi có cách map rõ).                                 |

### Phase C — Chất lượng model & API (tùy backlog)

| #   | Việc                                                                             | Ghi chú                                                                                                                                            |
| --- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Truyền `options` hoặc flag `liveInterview` trong body tới `/api/chat/rag/stream` | Hiện `tonePreference` / `includeCitations` trong schema có thể chưa được route dùng hết — xác nhận và wire hoặc bỏ khỏi client để tránh hiểu nhầm. |
| C2  | System instructions riêng cho live interview                                     | Ví dụ: “Bạn đang hỗ trợ ứng viên **trong** buổi phỏng vấn; trả lời ngắn, hành động được; ưu tiên trích dẫn từ tài liệu đã chọn.”                   |

---

## 5. Rủi ro & quyết định

- **Chật layout 3 cột:** ưu tiên drawer/sheet cho doc selector thay vì cột thứ 4 cố định.
- **Trùng session chat dashboard:** nếu không làm B2, user có thể thấy lịch sử RAG từ dashboard trong cùng `activeSessionId` — chấp nhận tạm hoặc clear session khi mount playground.
- **Doc chưa index:** reuse logic hiện có từ upload pipeline; nếu `openaiFileId` null thì không vào filter — có thể thêm toast “Tài liệu chưa sẵn sàng” khi chọn.

---

## 6. Định nghĩa xong (Definition of Done)

- [ ] Từ màn Live Interview, user chọn được ít nhất một document đã upload mà **không** cần mở trang Chat full layout.
- [ ] Gửi tin nhắn RAG với doc đã chọn; response có nguồn (citations) nhất quán với `/api/chat/rag/stream` hiện tại.
- [ ] Copy UI không còn giả định “panel bên phải” khi RAG nằm trong interview.
- [ ] (Nếu làm Phase B) Có chiến lược rõ ràng cho `activeSessionId` / `selectedDocuments` khi đổi interview hoặc reload.

---

## 7. File code tham chiếu

- `components/live-interview-playground-v2.tsx` — mount RAG.
- `components/chat/streaming-chat.tsx` — UI + gửi `selectedDocuments`.
- `components/chat/document-selector.tsx` — tái sử dụng / tách sub-component.
- `components/chat/chat-with-documents.tsx` — layout tham chiếu đầy đủ.
- `app/api/chat/rag/stream/route.ts`, `lib/openai/file-search-stream.ts` — không bắt buộc đổi cho Phase A nếu chỉ thiếu UI.
