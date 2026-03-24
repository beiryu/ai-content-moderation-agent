# Design Spec: OpenAI Transcription + Question Classifier

**Date:** 2026-03-23
**Status:** Approved
**Author:** Claude Code + User

---

## Problem Statement

The current system uses Deepgram Nova-2 for real-time speech-to-text during interview sessions. Two critical issues:

1. **Deepgram does not support Vietnamese.** Interviewers speak a mix of Vietnamese and English (code-switching). Nova-2/3 cannot transcribe Vietnamese, producing garbled or meaningless output for mixed-language speech.

2. **No question validation layer.** After `UtteranceEnd` fires (at 300ms silence), any buffer content — including fragments like "yes", "no", "ok", filler sounds — is immediately sent to `analyzeMessage()`, triggering a full AI response for non-questions.

---

## Goals

- Replace Deepgram with a Whisper-based model that handles Vietnamese + English code-switching natively.
- Add a lightweight question classifier that gates `analyzeMessage()` — only fire the expensive AI pipeline when the interviewer has asked a real, complete question.
- Minimize changes to existing components outside the transcription layer.

---

## Architecture

### Current Flow (broken)

```
Mic → MediaRecorder (WebM/Opus blobs) → queue → connection.send(blob) → Deepgram Nova-2
                                                                              → processTranscript() → buffer
                                                                              → UtteranceEnd (300ms silence)
                                                                                    → flushTranscript()
                                                                                          → analyzeMessage()  ← no filter
```

### New Flow

```
Mic → AudioContext → AudioWorkletProcessor → PCM16 24kHz → base64
                                                              → WebSocket.send(input_audio_buffer.append)
                                                                    → OpenAI Realtime API (gpt-4o-transcribe)
                                                                          → transcript delta  → processTranscript(text, false)
                                                                          → transcript done   → processTranscript(text, true)
                                                                          → speech_stopped (1200ms silence)
                                                                                → flushTranscript() [async]
                                                                                      → Question Classifier (GPT-4o-mini)
                                                                                              ↓ isQuestion: true
                                                                                        analyzeMessage()
                                                                                              ↓ isQuestion: false
                                                                                        skip (message saved in history)
```

**Key architecture change:** The new hook internalises the entire audio pipeline (AudioContext → PCM16 → WebSocket). Consumer components no longer manage the audio queue or call `connection.send()` directly. They call `startListening()` / `stopListening()` on the hook instead.

---

## Components

### 1. `app/api/transcription-session/route.ts` (new)

Backend endpoint that creates an ephemeral OpenAI token for the client to use when connecting to the Realtime WebSocket directly. Avoids exposing the API key in the browser.

Authentication: Use `getCurrentUser()` from `lib/session.ts`. Return 401 if result is null.

```
GET /api/transcription-session
→ 200 { client_secret: { value: string, expires_at: number } }
→ 401 if not authenticated
```

Token lifetime: 60 seconds (OpenAI default). Client must connect within this window.

---

### 2. `hooks/use-openai-transcription.ts` (replaces `use-deepgram-connection.ts`)

Connects to `wss://api.openai.com/v1/realtime?model=gpt-4o-transcribe` via native WebSocket.

**This hook owns the entire audio pipeline.** It creates `AudioContext`, attaches an `AudioWorkletProcessor` to convert mic input to PCM16 24kHz, base64-encodes it, and sends it as `input_audio_buffer.append` JSON messages. Consumer components do not interact with audio or the WebSocket directly.

**Session config sent after `session.created`:**

```json
{
  "type": "session.update",
  "session": {
    "input_audio_format": "pcm16",
    "input_audio_transcription": {
      "model": "gpt-4o-transcribe"
    },
    "turn_detection": {
      "type": "server_vad",
      "silence_duration_ms": 1200,
      "threshold": 0.5
    }
  }
}
```

Notes:

- `language` field is **omitted** entirely (not set to `null`) — omitting it enables automatic language detection.
- `silence_duration_ms: 1200ms` vs current 300ms — allows natural pauses for non-native speakers.
- `server_vad` — OpenAI handles VAD server-side, replacing Deepgram's `endpointing`.

**Silence fallback interval:**
The existing hook has a 1-second polling interval that calls `flushTranscript` if no audio for 5 seconds (fallback for when `UtteranceEnd` never fires). The new hook **retains this fallback** for the same reason: if `speech_stopped` fails to fire due to a network issue or VAD miss, the buffer would never flush. The interval checks `lastSpeakTime` from the store, identical to current behavior.

**Events handled:**

| Event                                                   | Action                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `session.created`                                       | Send `session.update` config; set status `"ready"`, `isListening: true` |
| `conversation.item.input_audio_transcription.delta`     | `processTranscript(delta, false)`                                       |
| `conversation.item.input_audio_transcription.completed` | `processTranscript(text, true)`                                         |
| `input_audio_buffer.speech_stopped`                     | `flushTranscript(role)`                                                 |
| WebSocket `close`                                       | set `isListening: false`, attempt reconnect                             |
| WebSocket `error`                                       | set status `"error"`                                                    |

**Return interface** (updated — `connection` removed, `startListening`/`stopListening` added):

```ts
interface UseOpenAITranscriptionReturn {
  isListening: boolean
  startListening: () => Promise<void>
  stopListening: () => void
  status: "idle" | "loading" | "ready" | "error"
  error: Error | null
}
```

`connection` is no longer exposed. Consumers call `startListening()` to request mic access and begin streaming, and `stopListening()` to end the session.

**Reconnect logic:**
On unexpected close: retry with exponential backoff (1s, 2s, 4s, max 3 attempts). After 3 failures, set status `"error"` and show user-facing toast.

---

### 3. `app/api/assistant/classify-question/route.ts` (new)

Fast two-tier classification before triggering the expensive AI analysis pipeline.

Authentication: Use `getCurrentUser()` from `lib/session.ts`. Return 401 if null.

**Tier 1 — Free, <1ms (word count check):**
If transcript has fewer than 4 words → return `{ isQuestion: false }`. No LLM call.

**Tier 2 — GPT-4o-mini, ~100ms:**

```
POST /api/assistant/classify-question
Body: { text: string, context: { role: string, content: string }[] }
→ 200 { isQuestion: boolean }
```

`context` contains the last 3 messages before the current one (not including the current message). The store passes `messages.slice(Math.max(0, currentIndex - 3), currentIndex)` where `currentIndex = messages.length - 1` at the time of calling (the current message has already been appended). The 3-message window is intentional — the classifier only needs enough context to disambiguate the current fragment, whereas `analyzeMessage` uses 6 messages to generate a full answer. These windows can differ and should not be kept in sync.

System prompt (kept minimal for speed and cost):

```
You are a classifier for interview transcripts. The speech may be Vietnamese, English, or mixed.

Determine if the transcript is a complete interview question worth answering.

Return only valid JSON: { "isQuestion": true } or { "isQuestion": false }

Return false for:
- Single words or short filler sounds (yes, no, ok, ừ, uh, hmm, right, okay)
- Incomplete fragments (trailing off mid-sentence)
- Affirmations or acknowledgements

Return true for:
- Complete questions requiring a substantive answer
- Statements that clearly prompt a response
```

**Timeout:** 2000ms. On timeout or any error → fallback to `true` (preserve existing behavior, always analyze).

---

### 4. `stores/interview-session.store.ts` — modified

**New state:**

```ts
isClassifying: boolean // used by the interviewer panel to show a brief loading indicator
```

**`flushTranscript` signature change:**

The function becomes `async` since it needs to await the classifier HTTP call.

```ts
// Before
flushTranscript: (role: "interviewer" | "candidate") => void

// After
flushTranscript: (role: "interviewer" | "candidate") => Promise<void>
```

The store interface definition in `InterviewSessionStore` must be updated accordingly.

**Modified `flushTranscript(role)` logic:**

```
1. Get buffer, trim
2. If empty → return
3. Create message object, append to messages[]
4. Clear buffer + interimText
5. If role !== "interviewer" → return (candidates don't need analysis)
6. set isClassifying: true
7. POST /api/assistant/classify-question with { text: buffer, context: last 3 messages }
8. set isClassifying: false
9. If isQuestion: true → call analyzeMessage(messageId)
10. On classifier error/timeout → call analyzeMessage(messageId) [fallback]
```

All callers of `flushTranscript` (the hook's `speech_stopped` handler and the silence fallback interval) fire-and-forget with `.catch(console.error)` since they are event handlers.

Note: Messages are always saved to history regardless of classification result. Only `analyzeMessage()` is gated.

---

## Error Handling Summary

| Scenario                     | Behavior                                      |
| ---------------------------- | --------------------------------------------- |
| Classifier timeout (>2s)     | Fallback: call `analyzeMessage()`             |
| Classifier API error         | Fallback: call `analyzeMessage()`             |
| WebSocket disconnect         | Auto-reconnect, max 3 attempts with backoff   |
| Reconnect fails              | status `"error"`, toast notification          |
| Language detection failure   | OpenAI auto-detect handles gracefully         |
| `speech_stopped` never fires | Silence fallback interval (5s) flushes buffer |

---

## What Does NOT Change

- `analyzeMessage()` logic and streaming response pipeline
- OpenAI Agents, vector store, session context
- `processTranscript()` signature and behavior
- Interview message history structure
- `/api/deepgram` route — kept, not deleted immediately

---

## Cost Impact

|            | Current                      | New                                                           |
| ---------- | ---------------------------- | ------------------------------------------------------------- |
| STT        | Deepgram Nova-2: $0.0043/min | OpenAI gpt-4o-transcribe: $0.006/min (verify current pricing) |
| Classifier | —                            | GPT-4o-mini: ~$0.00001/call                                   |
| Delta      | +$0.0017/min STT             | negligible classifier cost                                    |

For a 60-minute interview session: ~$0.10 additional cost. Justified by Vietnamese support and elimination of false-positive analysis calls.

---

## Files Changed

| File                                           | Change                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `hooks/use-openai-transcription.ts`            | New — full audio pipeline + WebSocket to OpenAI                                                  |
| `app/api/transcription-session/route.ts`       | New — ephemeral token endpoint                                                                   |
| `app/api/assistant/classify-question/route.ts` | New — question classifier endpoint                                                               |
| `stores/interview-session.store.ts`            | Add `isClassifying`, make `flushTranscript` async                                                |
| `components/recorder-transcriber.tsx`          | Replace `useDeepgramConnection` import + `connection.send` with `startListening`/`stopListening` |
| `components/mic-only-recorder.tsx`             | Same as above                                                                                    |
| `hooks/use-microphone.ts`                      | May be internalised into new hook; no longer used by consumers directly                          |
| `hooks/use-microphone-only.ts`                 | Same as above                                                                                    |
