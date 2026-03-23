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
Mic → WebSocket → Deepgram Nova-2 → processTranscript() → buffer
                                  → UtteranceEnd (300ms silence)
                                         → flushTranscript()
                                               → analyzeMessage()  ← no filter, always fires
```

### New Flow

```
Mic → WebSocket → OpenAI Realtime API (gpt-4o-transcribe)
                        → transcript delta  → processTranscript(text, false)  [interim]
                        → transcript done   → processTranscript(text, true)   [final]
                        → speech_stopped (1200ms silence)
                                → flushTranscript()
                                      → Question Classifier (GPT-4o-mini)
                                              ↓ isQuestion: true
                                        analyzeMessage()
                                              ↓ isQuestion: false
                                        skip analysis (message still saved in history)
```

---

## Components

### 1. `app/api/transcription-session/route.ts` (new)

Backend endpoint that creates an ephemeral OpenAI token for the client to use when connecting to the Realtime WebSocket directly. This avoids exposing the API key in the browser.

```
GET /api/transcription-session
→ 200 { client_secret: { value: string, expires_at: number } }
→ 401 if not authenticated
```

Token lifetime: 60 seconds (OpenAI default). Client must connect within this window.

---

### 2. `hooks/use-openai-transcription.ts` (replaces `use-deepgram-connection.ts`)

Connects to `wss://api.openai.com/v1/realtime?model=gpt-4o-transcribe` via native WebSocket.

**Session config sent on connect:**

```json
{
  "type": "session.update",
  "session": {
    "input_audio_format": "pcm16",
    "input_audio_transcription": {
      "model": "gpt-4o-transcribe",
      "language": null
    },
    "turn_detection": {
      "type": "server_vad",
      "silence_duration_ms": 1200,
      "threshold": 0.5
    }
  }
}
```

Key differences from Deepgram config:
- `language: null` → auto-detect Vietnamese/English per segment
- `silence_duration_ms: 1200ms` vs current 300ms → allows natural pauses for non-native speakers without premature flush
- `server_vad` → OpenAI handles VAD server-side, same as Deepgram's endpointing

**Audio pipeline:**
Browser `AudioContext` → `AudioWorkletProcessor` → raw PCM16 24kHz → base64 → WebSocket.
(Browser `MediaRecorder` outputs WebM/Opus which OpenAI Realtime does not accept.)

**Events handled:**

| Event | Action |
|-------|--------|
| `session.created` | set status `"ready"`, `isListening: true` |
| `conversation.item.input_audio_transcription.delta` | `processTranscript(delta, false)` |
| `conversation.item.input_audio_transcription.completed` | `processTranscript(text, true)` |
| `input_audio_buffer.speech_stopped` | `flushTranscript(role)` |
| WebSocket `close` | set `isListening: false`, attempt reconnect |
| WebSocket `error` | set status `"error"` |

**Return interface** (identical to current `use-deepgram-connection.ts`):

```ts
interface UseOpenAITranscriptionReturn {
  isListening: boolean
  connection: WebSocket | null
  status: "idle" | "loading" | "ready" | "error"
  error: Error | null
}
```

Keeping the same interface means all components that consume the hook require no changes — only the import path changes.

**Reconnect logic:**
On unexpected close: retry with exponential backoff (1s, 2s, 4s, max 3 attempts). After 3 failures, set status `"error"` and show user-facing toast.

---

### 3. `app/api/assistant/classify-question/route.ts` (new)

Fast two-tier classification before triggering the expensive AI analysis pipeline.

**Tier 1 — Free, <1ms (word count check):**
If transcript has fewer than 4 words → `{ isQuestion: false }`. No LLM call.

**Tier 2 — GPT-4o-mini, ~100ms:**

```
POST /api/assistant/classify-question
Body: { text: string, context: { role: string, content: string }[] }
→ 200 { isQuestion: boolean }
```

System prompt (kept minimal for speed and cost):

```
You are a classifier for interview transcripts. The speech may be Vietnamese, English, or mixed.

Determine if the transcript is a complete interview question worth answering.

Return only valid JSON: { "isQuestion": true } or { "isQuestion": false }

Return false for:
- Single words or short filler sounds (yes, no, ok, ừ, uh, hmm, right)
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
isClassifying: boolean  // show loading indicator during classifier call
```

**Modified `flushTranscript(role)`:**

```
1. Get buffer, trim
2. If empty → return
3. Create message object, append to messages[]
4. Clear buffer
5. If role !== "interviewer" → return (candidates don't need analysis)
6. set isClassifying: true
7. Call POST /api/assistant/classify-question
8. set isClassifying: false
9. If isQuestion: true → call analyzeMessage(messageId)
10. On classifier error/timeout → call analyzeMessage(messageId) [fallback]
```

Note: The message is always saved to history regardless of classification result. Only `analyzeMessage()` is gated.

---

## Error Handling Summary

| Scenario | Behavior |
|----------|----------|
| Classifier timeout (>2s) | Fallback: call `analyzeMessage()` |
| Classifier API error | Fallback: call `analyzeMessage()` |
| WebSocket disconnect | Auto-reconnect, max 3 attempts with backoff |
| Reconnect fails | status `"error"`, toast notification |
| Language detection failure | OpenAI auto-detect handles gracefully |

---

## What Does NOT Change

- `analyzeMessage()` logic and streaming response pipeline
- OpenAI Agents, vector store, session context
- All UI components consuming the transcription hook (only import path changes)
- `/api/deepgram` route — kept, not deleted immediately
- `processTranscript()` signature and behavior
- Interview message history structure

---

## Cost Impact

| | Current | New |
|--|---------|-----|
| STT | Deepgram Nova-2: $0.0043/min | OpenAI gpt-4o-transcribe: $0.006/min |
| Classifier | — | GPT-4o-mini: ~$0.00001/call |
| Delta | +$0.0017/min STT | negligible classifier cost |

For a 60-minute interview session: ~$0.10 additional cost. Justified by Vietnamese support and elimination of false-positive analysis calls.

---

## Files Changed

| File | Change |
|------|--------|
| `hooks/use-openai-transcription.ts` | New (replaces Deepgram hook) |
| `app/api/transcription-session/route.ts` | New |
| `app/api/assistant/classify-question/route.ts` | New |
| `stores/interview-session.store.ts` | Add `isClassifying`, modify `flushTranscript` |
| Components using hook | Import path update only |
