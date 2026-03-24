# Config Service Design

**Date:** 2026-03-24
**Status:** Approved
**Scope:** Consolidate all scattered settings into a schema-driven config service with operator defaults, per-user DB preferences, and client-side private key storage.

---

## Problem

Config values are scattered across the codebase with no single source of truth:

| Location | Hardcoded Values |
|---|---|
| `config/rag.ts` | OpenAI model, temperature, maxTokens |
| `app/api/transcription-session/route.ts` | `model: "gpt-4o-realtime-preview"`, `voice: "alloy"` |
| `app/api/assistant/classify-question/route.ts` | `model: "gpt-4o-mini"`, timeout 2000ms, max_tokens: 20 |
| `app/api/assistant/completion/route.ts` | `temperature: 0.5` (inconsistent with `config/rag.ts` which uses 0.2) |
| `hooks/use-deepgram-connection.ts` | `model: "nova-3"`, `endpointing: 1200`, keepAlive 10s, silence 5s |
| `hooks/use-openai-transcription.ts` | WebSocket URL, `model: "gpt-4o-realtime-preview"`, transcription model `"gpt-4o-transcribe"`, VAD `silence_duration_ms: 1200`, VAD `threshold: 0.5` |
| `lib/openai/file-search-stream.ts` | Imports `RAG_CONFIG` directly: model, temperature, maxTokens |
| `lib/agents/interview-agents.ts` | `model: "gpt-4o-mini"` hardcoded in `AnswerCoach` agent |
| `app/api/chat/rag/stream/route.ts` | `PREV_RESP_TTL = 86400` |

There is no way for users to customize settings, and no safe upgrade path when values change.

---

## Goals

1. All settings live in one `config/` folder with clear domain separation
2. Every access goes through `ConfigService` — no raw hardcoded values outside `config/defaults/`
3. End users can override allowed settings, persisted to DB
4. Private values (API keys) stay in localStorage only — never sent to server
5. Zod schemas validate all config at runtime — invalid values fall back to operator defaults
6. Schema versioning enables safe migration as config evolves

---

## Architecture

### Directory Structure

```
config/
  defaults/
    deepgram.ts          ← operator defaults for Deepgram
    openai.ts            ← operator defaults for OpenAI (chat, realtime, classify, transcribe)
    interview.ts         ← timing thresholds (silence, keepAlive, VAD)
    site.ts              ← unchanged
    subscriptions.ts     ← unchanged
    marketing.ts         ← unchanged
  schemas/
    deepgram.schema.ts   ← Zod schema + TypeScript types for Deepgram config
    openai.schema.ts     ← Zod schema + TypeScript types for OpenAI config
    interview.schema.ts  ← Zod schema + TypeScript types for interview settings
    user-config.schema.ts ← merged schema: fields users are allowed to override
  index.ts               ← re-exports defaults and schemas (see note on edge runtime below)

lib/config/
  config.service.ts      ← ConfigService: merge, validate, serve
  config.context.tsx     ← React context + provider for client
  config.hooks.ts        ← useConfig(), useUserConfig() hooks
```

> **Note on `config/index.ts` barrel:** This file must NOT re-export anything that imports Prisma or other Node.js-only modules, as barrel imports can break tree-shaking for the Edge runtime. Operator defaults and schemas are safe to re-export (they are plain objects). `ConfigService` is Node.js only and must be imported directly from `lib/config/config.service.ts`.

---

## Operator Defaults

Static TypeScript files in `config/defaults/`. Changed via git like normal code. No runtime writes.

**`config/defaults/openai.ts`**
```ts
export const OPENAI_DEFAULTS = {
  chat: {
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxTokens: 2000,
    presencePenalty: 0.1,
    frequencyPenalty: 0.2,
  },
  // interviewAssistant uses a distinct temperature from general chat (was 0.5 in completion route)
  interviewAssistant: {
    temperature: 0.5,
  },
  classify: {
    model: "gpt-4o-mini",
    maxTokens: 20,
    temperature: 0,
    timeoutMs: 2000,
  },
  realtime: {
    model: "gpt-4o-realtime-preview",
    voice: "alloy",
    // env.OPENAI_BASE_URL is a required env var (z.string().min(1) in env.mjs) so it is
    // always present at runtime. baseFallbackURL is only reached in local dev before
    // .env.local is populated. If you want the fallback to be exercisable in production,
    // change env.mjs to z.string().optional() for OPENAI_BASE_URL.
    baseFallbackURL: "https://api.openai.com/v1",
  },
  transcribe: {
    model: "gpt-4o-transcribe",
  },
  memory: {
    model: "gpt-3.5-turbo",
    temperature: 0,
  },
  agent: {
    // AnswerCoach in lib/agents/interview-agents.ts
    answerCoachModel: "gpt-4o-mini",
  },
  cache: {
    prevResponseTtlSec: 86400,
  },
} as const
```

**`config/defaults/deepgram.ts`**
```ts
// Note: "endpointing" is the exact Deepgram API field name (ms before end-of-speech is declared)
export const DEEPGRAM_DEFAULTS = {
  model: "nova-3",
  language: "multi",
  interimResults: true,
  smartFormat: true,
  utteranceEndMs: 2500,
  endpointing: 1200,
  keepAliveIntervalMs: 10000,
} as const
```

**`config/defaults/interview.ts`**
```ts
export const INTERVIEW_DEFAULTS = {
  silenceThresholdMs: 5000,
  silenceCheckIntervalMs: 1000,
  vad: {
    silenceDurationMs: 1200,
    threshold: 0.5,
  },
} as const
```

---

## Zod Schemas

Schemas define shape, constraints, and allowed user-overridable fields. Historical versions are kept in the same file using a `V{N}` naming convention so migrations can reference them.

**`config/schemas/user-config.schema.ts`**
```ts
export const CURRENT_SCHEMA_VERSION = 1

// V1 — initial schema
export const UserConfigSchemaV1 = z.object({
  schemaVersion: z.literal(1).default(1),

  // OpenAI
  chatModel: z.enum(["gpt-4o-mini", "gpt-4o"]).optional(),
  chatTemperature: z.number().min(0).max(1).optional(),
  realtimeModel: z.enum(["gpt-4o-realtime-preview"]).optional(),
  realtimeVoice: z.enum(["alloy", "echo", "shimmer", "verse", "ash"]).optional(),

  // Deepgram
  deepgramModel: z.enum(["nova-3", "nova-2"]).optional(),
  deepgramLanguage: z.string().optional(),

  // Interview behavior
  silenceThresholdMs: z.number().int().min(1000).max(30000).optional(),
  utteranceEndMs: z.number().int().min(500).max(10000).optional(),
})

// Current schema alias — bump this when adding V2
export const UserConfigSchema = UserConfigSchemaV1
export type UserConfig = z.infer<typeof UserConfigSchema>

// Migration map: old version → transform to current
// Add entries here when introducing V2+
export const migrations: Record<number, (data: unknown) => unknown> = {
  // example for future: 1: (data) => ({ ...data, schemaVersion: 2, newField: "default" })
}
```

**Private keys schema (client-only, never persisted to DB):**
```ts
// Format validation catches common copy-paste errors before any network call
export const PrivateKeysSchema = z.object({
  openaiApiKey: z.string().startsWith("sk-").optional(),
  deepgramApiKey: z.string().min(32).optional(),
})
export type PrivateKeys = z.infer<typeof PrivateKeysSchema>
```

---

## Data Model

```prisma
model UserConfig {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  schemaVersion Int @default(1)

  // OpenAI
  chatModel        String?
  chatTemperature  Float?
  realtimeModel    String?
  realtimeVoice    String?

  // Deepgram
  deepgramModel    String?
  deepgramLanguage String?

  // Interview behavior
  silenceThresholdMs  Int?
  utteranceEndMs      Int?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

`localStorage` stores only:
```ts
{ openaiApiKey?: string, deepgramApiKey?: string }
```
These are never sent to the server. Hooks use them for direct client-side API calls only.

---

## API Endpoints

```
GET  /api/user/config   → returns merged UserConfig (no private keys)
PUT  /api/user/config   → validates body with UserConfigSchema, upsert (creates or updates) to DB
```

Both endpoints require authentication (`getServerSession`). Unauthenticated requests return 401.

**`GET /api/user/config` response:**
- If no `UserConfig` row exists yet (first-time user): returns `200` with all optional fields set to `null` and `schemaVersion: 1`. The client merges this with operator defaults normally.
- Returns the raw DB row values — the client merges with operator defaults in `ConfigProvider`.

**`PUT /api/user/config` semantics:**
- Always uses `prisma.userConfig.upsert` (create on first write, update on subsequent writes).
- Validates request body with `UserConfigSchema` before writing. Returns `400` with Zod error details on validation failure.
- Returns the updated merged config (same shape as `GET`).

---

## ConfigService

`lib/config/config.service.ts` — single entry point for all config reads on the server.

> **Edge runtime constraint:** `ConfigService.forUser()` calls Prisma and cannot run in the Edge runtime. The route `app/api/assistant/completion/route.ts` currently has `export const runtime = "edge"` — this declaration must be removed as part of this implementation so that route can use `ConfigService`. Removing the edge declaration changes the route from an edge function to a Node.js serverless function; this is an accepted trade-off for consistent config access.

### Server Mode (API Routes)

```ts
// Reads operator defaults → merges with UserConfig from DB → validates via Zod
const config = await ConfigService.forUser(userId)

config.openai.chat.model             // "gpt-4o" if user set it, "gpt-4o-mini" if not
config.openai.realtime.baseURL       // env.OPENAI_BASE_URL wins; falls back to baseFallbackURL
config.deepgram.model                // "nova-3" (operator default)
config.interview.silenceThresholdMs  // 3000 if user overrode, 5000 otherwise
```

### Client Mode (Hooks / Components)

```ts
// Hydrates from /api/user/config → merges with localStorage keys → exposed via React context
const { config, updateConfig } = useConfig()

config.openai.chat.model
config.privateKeys.openaiApiKey  // from localStorage, never sent to server
```

### Merge Strategy

```
Resolved Config = Operator Defaults ← DB UserConfig ← (client-only: localStorage keys)
```

Right side wins. If a DB value is `null`/`undefined`, the operator default is used. Zod validates the merged result — any invalid value is stripped and the operator default is used for that field.

**`env.OPENAI_BASE_URL` vs default:** `ConfigService.forUser()` resolves `openai.realtime.baseURL` as `env.OPENAI_BASE_URL ?? OPENAI_DEFAULTS.realtime.baseFallbackURL`. `env.OPENAI_BASE_URL` is currently a required field in `env.mjs` (`z.string().min(1)`), so the fallback is only reachable in local dev before `.env.local` is populated. To make the fallback live at runtime, change the validation in `env.mjs` to `z.string().optional()`.

### Fallback on Error

- DB read fails → use operator defaults entirely (app does not crash)
- Zod parse fails on a field → strip that field, use operator default for it
- DB unavailable at startup → operator defaults used for the entire request

---

## Client Context Hydration

`ConfigProvider` is mounted in the **dashboard layout** (`app/(dashboard)/dashboard/layout.tsx`) as a Server Component wrapper:

```tsx
// app/(dashboard)/dashboard/layout.tsx  (Server Component)
import { ConfigProvider } from "@/lib/config/config.context"
import { getCurrentUser } from "@/lib/session"
import { ConfigService } from "@/lib/config/config.service"

export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser()
  // Pre-fetch merged config on the server and pass as a prop to avoid a client waterfall
  const initialConfig = user ? await ConfigService.forUser(user.id) : null
  return <ConfigProvider initialConfig={initialConfig}>{children}</ConfigProvider>
}
```

`ConfigProvider` (Client Component) receives `initialConfig` as a prop — no loading spinner needed for the initial render. localStorage keys are merged on the client after mount via a `useEffect`. The `useConfig()` hook returns operator defaults synchronously before `initialConfig` arrives (i.e., in pages outside the dashboard layout or during SSR).

**Unauthenticated pages** (e.g., `app/(marketing)`) do not mount `ConfigProvider`. Code in those pages that calls `useConfig()` must handle the case where the hook returns operator defaults only (no user overrides).

---

## Schema Versioning & Migration

```prisma
schemaVersion Int @default(1)
```

The `@default(1)` value is always kept in sync with `CURRENT_SCHEMA_VERSION` in code. When bumping to V2, a Prisma migration updates the column default.

### Migration flow in `ConfigService.forUser()`

1. Read `schemaVersion` from DB row.
2. If `schemaVersion === CURRENT_SCHEMA_VERSION`, parse with `UserConfigSchema` directly.
3. If `schemaVersion < CURRENT_SCHEMA_VERSION`, apply migrations sequentially:
   ```ts
   let data: unknown = rawRow
   for (let v = rawRow.schemaVersion; v < CURRENT_SCHEMA_VERSION; v++) {
     data = migrations[v]?.(data) ?? data
   }
   return UserConfigSchema.parse(data)
   ```
4. If Zod parse still fails after migration: **reset the row to all-null values** (preserving the user's `id`/`userId`), log a structured warning with the user ID and raw data for ops investigation, and return operator defaults. This is a last-resort path — the warning must be actionable so an engineer can manually recover user preferences if needed.
5. After a successful migration, write the migrated data back to DB with the new `schemaVersion`.

### Adding a new schema version

1. Define `UserConfigSchemaV2` extending V1.
2. Add a `migrations[1]` entry that transforms V1 → V2 shape.
3. Set `export const UserConfigSchema = UserConfigSchemaV2`.
4. Bump `CURRENT_SCHEMA_VERSION = 2`.
5. Write a Prisma migration to update the `schemaVersion` column default.

Historical schema versions (`UserConfigSchemaV1`, etc.) are never deleted from the file — they are required for the migration transforms to work correctly across all existing DB rows.

---

## Complete Migration Table

Every hardcoded value replaced after this implementation:

| File | Before | After |
|---|---|---|
| `hooks/use-deepgram-connection.ts` | `model: "nova-3"` | `config.deepgram.model` via `useConfig()` |
| `hooks/use-deepgram-connection.ts` | `language: "multi"` | `config.deepgram.language` |
| `hooks/use-deepgram-connection.ts` | `interim_results: true` | `config.deepgram.interimResults` |
| `hooks/use-deepgram-connection.ts` | `smart_format: true` | `config.deepgram.smartFormat` |
| `hooks/use-deepgram-connection.ts` | `utteranceEndMs: 2500` | `config.deepgram.utteranceEndMs` |
| `hooks/use-deepgram-connection.ts` | `endpointing: 1200` | `config.deepgram.endpointing` |
| `hooks/use-deepgram-connection.ts` | keepAlive `10000` | `config.deepgram.keepAliveIntervalMs` |
| `hooks/use-deepgram-connection.ts` | silence `5000` | `config.interview.silenceThresholdMs` |
| `hooks/use-openai-transcription.ts` | `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview` | built from `config.openai.realtime.baseURL` + `config.openai.realtime.model` |
| `hooks/use-openai-transcription.ts` | `model: "gpt-4o-transcribe"` | `config.openai.transcribe.model` |
| `hooks/use-openai-transcription.ts` | VAD `silence_duration_ms: 1200` | `config.interview.vad.silenceDurationMs` |
| `hooks/use-openai-transcription.ts` | VAD `threshold: 0.5` | `config.interview.vad.threshold` |
| `app/api/transcription-session/route.ts` | `model: "gpt-4o-realtime-preview"` | `config.openai.realtime.model` |
| `app/api/transcription-session/route.ts` | `voice: "alloy"` | `config.openai.realtime.voice` |
| `app/api/transcription-session/route.ts` | `env.OPENAI_BASE_URL \|\| "https://..."` | `config.openai.realtime.baseURL` (resolved by ConfigService) |
| `app/api/assistant/classify-question/route.ts` | `model: "gpt-4o-mini"` | `config.openai.classify.model` |
| `app/api/assistant/classify-question/route.ts` | `max_tokens: 20` | `config.openai.classify.maxTokens` |
| `app/api/assistant/classify-question/route.ts` | `temperature: 0` | `config.openai.classify.temperature` |
| `app/api/assistant/classify-question/route.ts` | timeout `2000` | `config.openai.classify.timeoutMs` |
| `app/api/assistant/completion/route.ts` | `temperature: 0.5` | `config.openai.interviewAssistant.temperature` (preserved as 0.5, distinct from chat 0.2) |
| `app/api/assistant/completion/route.ts` | `model` from `RAG_CONFIG` | `config.openai.chat.model` |
| `lib/openai/file-search-stream.ts` | `RAG_CONFIG.models.chat.model` | `config.openai.chat.model` via argument passed from calling route |
| `lib/openai/file-search-stream.ts` | `RAG_CONFIG.models.chat.temperature` | `config.openai.chat.temperature` |
| `lib/openai/file-search-stream.ts` | `RAG_CONFIG.models.chat.maxTokens` | `config.openai.chat.maxTokens` |
| `lib/agents/interview-agents.ts` | `model: "gpt-4o-mini"` | `OPENAI_DEFAULTS.agent.answerCoachModel` (operator-only, not user-overridable) |
| `app/api/chat/rag/stream/route.ts` | `PREV_RESP_TTL = 86400` | `config.openai.cache.prevResponseTtlSec` |
| `config/rag.ts` | entire file | deleted — all consumers updated to use ConfigService or OPENAI_DEFAULTS |

> **Note on `lib/openai/file-search-stream.ts`:** This is a library function, not a route handler. It cannot call `ConfigService.forUser()` directly. The calling route (`app/api/chat/rag/stream/route.ts`) resolves the config and passes the relevant values as arguments to `streamWithFileSearch()`.

> **Note on `lib/agents/interview-agents.ts`:** The `AnswerCoach` agent model is operator-only (not user-overridable) because the `@openai/agents` SDK constructs the Agent object at call time with a static model string. It reads from `OPENAI_DEFAULTS.agent.answerCoachModel` directly — no ConfigService call needed.

> **Breaking change acknowledged:** `app/api/assistant/completion/route.ts` currently hardcodes `temperature: 0.5`. `config/rag.ts` has `temperature: 0.2`. These are intentionally kept separate in `OPENAI_DEFAULTS` (`chat.temperature: 0.2` and `interviewAssistant.temperature: 0.5`) so no behavior changes.

---

## Testing

- Unit: `ConfigService.forUser()` with mock DB rows — verify merge order and Zod validation
- Unit: invalid DB values are stripped and fall back to operator defaults
- Unit: version migration transforms work correctly (V1 row migrated to V2 shape)
- Unit: reset-to-defaults path logs a warning and returns operator defaults
- Integration: `GET /api/user/config` returns 200 with null fields for first-time user
- Integration: `GET /api/user/config` returns 401 for unauthenticated requests
- Integration: `PUT /api/user/config` with invalid values returns 400 with Zod error details
- Integration: `PUT /api/user/config` creates on first write, updates on subsequent writes

---

## Out of Scope

- UI settings page (separate feature)
- Config export/import
- Per-team or per-interview config overrides
