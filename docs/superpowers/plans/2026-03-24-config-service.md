<!-- cspell:ignore endpointing agentic -->

# Config Service Implementation Plan

> **For automated workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all scattered hardcoded config values into a schema-driven ConfigService backed by operator defaults, per-user DB preferences, and client-side private key storage.

**Architecture:** Operator defaults live in `config/defaults/`. Zod schemas in `config/schemas/` define what users can override. `lib/config/config.service.ts` is the single server-side entry point that merges DB + defaults. `lib/config/config.context.tsx` + `lib/config/config.hooks.ts` expose config to the client via React context hydrated from the server.

**Tech Stack:** Next.js 13 App Router, Prisma + PostgreSQL, Zod v4, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-24-config-service-design.md`

---

## File Map

| Action | File                                           | Responsibility                                         |
| ------ | ---------------------------------------------- | ------------------------------------------------------ |
| Create | `config/defaults/openai.ts`                    | All OpenAI operator defaults                           |
| Create | `config/defaults/deepgram.ts`                  | All Deepgram operator defaults                         |
| Create | `config/defaults/interview.ts`                 | Interview timing/VAD defaults                          |
| Create | `config/schemas/user-config.schema.ts`         | Zod schema for user-overridable fields + private keys  |
| Create | `config/index.ts`                              | Re-export defaults + schemas (no Prisma imports)       |
| Modify | `prisma/schema.prisma`                         | Add `UserConfig` model                                 |
| Create | `lib/config/config.service.ts`                 | Server-side merge + validate                           |
| Create | `app/api/user/config/route.ts`                 | GET + PUT endpoints                                    |
| Create | `lib/config/config.context.tsx`                | React context + ConfigProvider                         |
| Create | `lib/config/config.hooks.ts`                   | `useConfig()` hook                                     |
| Modify | `app/(dashboard)/dashboard/layout.tsx`         | Mount ConfigProvider with SSR initial config           |
| Modify | `app/api/assistant/completion/route.ts`        | Remove `runtime = "edge"`, use ConfigService           |
| Modify | `app/api/assistant/classify-question/route.ts` | Use ConfigService                                      |
| Modify | `app/api/transcription-session/route.ts`       | Use ConfigService                                      |
| Modify | `app/api/chat/rag/stream/route.ts`             | Use ConfigService, pass config to streamWithFileSearch |
| Modify | `lib/openai/file-search-stream.ts`             | Accept config values as arguments                      |
| Modify | `lib/agents/interview-agents.ts`               | Use OPENAI_DEFAULTS                                    |
| Modify | `hooks/use-deepgram-connection.ts`             | Use useConfig()                                        |
| Modify | `hooks/use-openai-transcription.ts`            | Use useConfig()                                        |
| Delete | `config/rag.ts`                                | Replaced by config/defaults/openai.ts                  |

---

## Task 1: Create operator defaults files

**Files:**

- Create: `config/defaults/openai.ts`
- Create: `config/defaults/deepgram.ts`
- Create: `config/defaults/interview.ts`

- [ ] **Step 1: Create `config/defaults/openai.ts`**

```ts
// config/defaults/openai.ts
export const OPENAI_DEFAULTS = {
  chat: {
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxTokens: 2000,
    presencePenalty: 0.1,
    frequencyPenalty: 0.2,
  },
  // interviewAssistant uses a distinct temperature from general chat
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
    // env.OPENAI_BASE_URL (required in env.mjs) always wins at runtime.
    // baseFallbackURL is only reached in local dev before .env.local is populated.
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
    answerCoachModel: "gpt-4o-mini",
  },
  cache: {
    prevResponseTtlSec: 86400,
  },
} as const

export type OpenAIDefaults = typeof OPENAI_DEFAULTS
```

- [ ] **Step 2: Create `config/defaults/deepgram.ts`**

```ts
// config/defaults/deepgram.ts
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

export type DeepgramDefaults = typeof DEEPGRAM_DEFAULTS
```

- [ ] **Step 3: Create `config/defaults/interview.ts`**

```ts
// config/defaults/interview.ts
export const INTERVIEW_DEFAULTS = {
  silenceThresholdMs: 5000,
  silenceCheckIntervalMs: 1000,
  vad: {
    silenceDurationMs: 1200,
    threshold: 0.5,
  },
} as const

export type InterviewDefaults = typeof INTERVIEW_DEFAULTS
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors related to the new files

- [ ] **Step 5: Commit**

```bash
git add config/defaults/
git commit -m "feat: add operator defaults files for OpenAI, Deepgram, and interview config"
```

---

## Task 2: Create Zod schemas

**Files:**

- Create: `config/schemas/user-config.schema.ts`
- Create: `config/index.ts`

Note: This project uses Zod v4 (`^4.3.6`). In Zod v4 the import path is still `"zod"` but some APIs changed — use `z.literal()`, `z.enum()`, `z.number()`, `z.string()` as normal.

- [ ] **Step 1: Create `config/schemas/user-config.schema.ts`**

```ts
// config/schemas/user-config.schema.ts
import { z } from "zod"

export const CURRENT_SCHEMA_VERSION = 1

// V1 — initial schema. Never delete historical versions; migrations depend on them.
export const UserConfigSchemaV1 = z.object({
  schemaVersion: z.literal(1).default(1),

  // OpenAI
  chatModel: z.enum(["gpt-4o-mini", "gpt-4o"]).optional(),
  chatTemperature: z.number().min(0).max(1).optional(),
  realtimeModel: z.enum(["gpt-4o-realtime-preview"]).optional(),
  realtimeVoice: z
    .enum(["alloy", "echo", "shimmer", "verse", "ash"])
    .optional(),

  // Deepgram
  deepgramModel: z.enum(["nova-3", "nova-2"]).optional(),
  deepgramLanguage: z.string().optional(),

  // Interview behavior
  silenceThresholdMs: z.number().int().min(1000).max(30000).optional(),
  utteranceEndMs: z.number().int().min(500).max(10000).optional(),
})

// Current schema alias — update this alias when adding V2+
export const UserConfigSchema = UserConfigSchemaV1
export type UserConfig = z.infer<typeof UserConfigSchema>

// Migration map: version N → transform data to version N+1 shape
// Add entries here when introducing V2+
export const configMigrations: Record<number, (data: unknown) => unknown> = {
  // example: 1: (data) => ({ ...(data as object), schemaVersion: 2, newField: "default" }),
}

// Private keys: client-only, never persisted to DB, never sent to server
export const PrivateKeysSchema = z.object({
  openaiApiKey: z.string().startsWith("sk-").optional(),
  deepgramApiKey: z.string().min(32).optional(),
})
export type PrivateKeys = z.infer<typeof PrivateKeysSchema>
```

- [ ] **Step 2: Create `config/index.ts`**

This barrel re-exports only plain objects and schemas — no Prisma, no Node.js-only modules.

```ts
// config/index.ts
// Operator defaults — safe for edge runtime (plain objects, no Node.js imports)
export { OPENAI_DEFAULTS } from "./defaults/openai"
export { DEEPGRAM_DEFAULTS } from "./defaults/deepgram"
export { INTERVIEW_DEFAULTS } from "./defaults/interview"
export { siteConfig } from "./site"
export { freePlan, proPlan } from "./subscriptions"
export { marketingConfig } from "./marketing"

// Schemas — safe for edge runtime (Zod only, no Node.js imports)
export {
  UserConfigSchema,
  UserConfigSchemaV1,
  CURRENT_SCHEMA_VERSION,
  configMigrations,
  PrivateKeysSchema,
} from "./schemas/user-config.schema"
export type { UserConfig, PrivateKeys } from "./schemas/user-config.schema"
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add config/schemas/ config/index.ts
git commit -m "feat: add Zod schemas for user config and private keys"
```

---

## Task 3: Add Prisma UserConfig model

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `UserConfig` model and relation to `User`**

In `prisma/schema.prisma`, add the `UserConfig` relation to the `User` model:

```prisma
// Inside the User model, add this line with the other relations:
userConfig        UserConfig?
```

Then add the new model after the existing models (before the Enums section):

```prisma
// ─── User Config ──────────────────────────────────────────────────────────────

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
  silenceThresholdMs Int?
  utteranceEndMs     Int?

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("user_configs")
}
```

- [ ] **Step 2: Run Prisma migration**

```bash
pnpm prisma migrate dev --name add_user_config
```

Expected: migration file created in `prisma/migrations/`, `prisma generate` runs automatically.

- [ ] **Step 3: Verify Prisma client compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors — `db.userConfig` is now available on the Prisma client.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add UserConfig Prisma model for per-user config overrides"
```

---

## Task 4: Create ConfigService

**Files:**

- Create: `lib/config/config.service.ts`

`ConfigService.forUser(userId)` is the only server-side way to get resolved config. It merges operator defaults with DB row values and validates via Zod. This file imports Prisma — never import it in edge runtime routes or `config/index.ts`.

- [ ] **Step 1: Create `lib/config/config.service.ts`**

```ts
// lib/config/config.service.ts

import { env } from "@/env.mjs"
import { DEEPGRAM_DEFAULTS } from "@/config/defaults/deepgram"
import { INTERVIEW_DEFAULTS } from "@/config/defaults/interview"
import { OPENAI_DEFAULTS } from "@/config/defaults/openai"
import {
  CURRENT_SCHEMA_VERSION,
  UserConfigSchema,
  configMigrations,
} from "@/config/schemas/user-config.schema"
import { db } from "@/lib/db"

export interface ResolvedConfig {
  openai: {
    chat: {
      model: string
      temperature: number
      maxTokens: number
      presencePenalty: number
      frequencyPenalty: number
    }
    interviewAssistant: { temperature: number }
    classify: {
      model: string
      maxTokens: number
      temperature: number
      timeoutMs: number
    }
    realtime: { model: string; voice: string; baseURL: string }
    transcribe: { model: string }
    memory: { model: string; temperature: number }
    agent: { answerCoachModel: string }
    cache: { prevResponseTtlSec: number }
  }
  deepgram: {
    model: string
    language: string
    interimResults: boolean
    smartFormat: boolean
    utteranceEndMs: number
    endpointing: number
    keepAliveIntervalMs: number
  }
  interview: {
    silenceThresholdMs: number
    silenceCheckIntervalMs: number
    vad: { silenceDurationMs: number; threshold: number }
  }
}

function buildBaseConfig(): ResolvedConfig {
  return {
    openai: {
      chat: { ...OPENAI_DEFAULTS.chat },
      interviewAssistant: { ...OPENAI_DEFAULTS.interviewAssistant },
      classify: { ...OPENAI_DEFAULTS.classify },
      realtime: {
        ...OPENAI_DEFAULTS.realtime,
        baseURL:
          env.OPENAI_BASE_URL ?? OPENAI_DEFAULTS.realtime.baseFallbackURL,
      },
      transcribe: { ...OPENAI_DEFAULTS.transcribe },
      memory: { ...OPENAI_DEFAULTS.memory },
      agent: { ...OPENAI_DEFAULTS.agent },
      cache: { ...OPENAI_DEFAULTS.cache },
    },
    deepgram: { ...DEEPGRAM_DEFAULTS },
    interview: { ...INTERVIEW_DEFAULTS, vad: { ...INTERVIEW_DEFAULTS.vad } },
  }
}

async function migrateAndParse(raw: unknown, schemaVersion: number) {
  let data = raw
  for (let v = schemaVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    data = configMigrations[v]?.(data) ?? data
  }
  return UserConfigSchema.safeParse(data)
}

export class ConfigService {
  static async forUser(userId: string): Promise<ResolvedConfig> {
    const base = buildBaseConfig()

    let row: Awaited<ReturnType<typeof db.userConfig.findUnique>> | null = null
    try {
      row = await db.userConfig.findUnique({ where: { userId } })
    } catch {
      // DB unavailable — return operator defaults
      return base
    }

    // First-time user: no row yet
    if (!row) return base

    // Migrate if needed
    const parseResult = await migrateAndParse(row, row.schemaVersion)

    if (!parseResult.success) {
      // Last resort: reset to all-null and return defaults
      console.warn(
        "[ConfigService] Failed to parse UserConfig — resetting to defaults",
        {
          userId,
          schemaVersion: row.schemaVersion,
          errors: parseResult.error.issues,
        }
      )
      try {
        await db.userConfig.update({
          where: { userId },
          data: {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            chatModel: null,
            chatTemperature: null,
            realtimeModel: null,
            realtimeVoice: null,
            deepgramModel: null,
            deepgramLanguage: null,
            silenceThresholdMs: null,
            utteranceEndMs: null,
          },
        })
      } catch {
        /* ignore secondary failure */
      }
      return base
    }

    const userConfig = parseResult.data

    // Write back migrated version if version changed
    if (row.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      try {
        await db.userConfig.update({
          where: { userId },
          data: { schemaVersion: CURRENT_SCHEMA_VERSION },
        })
      } catch {
        /* non-fatal */
      }
    }

    // Merge user overrides onto base (right-side wins, undefined/null falls back to default)
    if (userConfig.chatModel) base.openai.chat.model = userConfig.chatModel
    if (userConfig.chatTemperature != null)
      base.openai.chat.temperature = userConfig.chatTemperature
    if (userConfig.realtimeModel)
      base.openai.realtime.model = userConfig.realtimeModel
    if (userConfig.realtimeVoice)
      base.openai.realtime.voice = userConfig.realtimeVoice
    if (userConfig.deepgramModel) base.deepgram.model = userConfig.deepgramModel
    if (userConfig.deepgramLanguage)
      base.deepgram.language = userConfig.deepgramLanguage
    if (userConfig.silenceThresholdMs != null)
      base.interview.silenceThresholdMs = userConfig.silenceThresholdMs
    if (userConfig.utteranceEndMs != null)
      base.deepgram.utteranceEndMs = userConfig.utteranceEndMs

    return base
  }

  /** Returns operator defaults only — use when no user context is available. */
  static getDefaults(): ResolvedConfig {
    return buildBaseConfig()
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/config/config.service.ts
git commit -m "feat: add ConfigService for server-side merged config resolution"
```

---

## Task 5: Create GET + PUT /api/user/config endpoints

**Files:**

- Create: `app/api/user/config/route.ts`

- [ ] **Step 1: Create the route file**

```ts
// app/api/user/config/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import {
  CURRENT_SCHEMA_VERSION,
  UserConfigSchema,
} from "@/config/schemas/user-config.schema"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const row = await db.userConfig.findUnique({
    where: { userId: session.user.id },
  })

  // First-time user: return null fields with current schema version
  if (!row) {
    return NextResponse.json({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      chatModel: null,
      chatTemperature: null,
      realtimeModel: null,
      realtimeVoice: null,
      deepgramModel: null,
      deepgramLanguage: null,
      silenceThresholdMs: null,
      utteranceEndMs: null,
    })
  }

  return NextResponse.json(row)
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()
  const parsed = UserConfigSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid config", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const data = parsed.data
  const configFields = {
    schemaVersion: data.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    chatModel: data.chatModel ?? null,
    chatTemperature: data.chatTemperature ?? null,
    realtimeModel: data.realtimeModel ?? null,
    realtimeVoice: data.realtimeVoice ?? null,
    deepgramModel: data.deepgramModel ?? null,
    deepgramLanguage: data.deepgramLanguage ?? null,
    silenceThresholdMs: data.silenceThresholdMs ?? null,
    utteranceEndMs: data.utteranceEndMs ?? null,
  }

  // select: true strips internal DB fields (id, userId, createdAt, updatedAt)
  // so the response shape matches the UserConfig schema the client expects
  const updated = await db.userConfig.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...configFields },
    update: configFields,
    select: {
      schemaVersion: true,
      chatModel: true,
      chatTemperature: true,
      realtimeModel: true,
      realtimeVoice: true,
      deepgramModel: true,
      deepgramLanguage: true,
      silenceThresholdMs: true,
      utteranceEndMs: true,
    },
  })

  return NextResponse.json(updated)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/user/config/
git commit -m "feat: add GET and PUT /api/user/config endpoints"
```

---

## Task 6: Create React context and useConfig hook

**Files:**

- Create: `lib/config/config.context.tsx`
- Create: `lib/config/config.hooks.ts`

- [ ] **Step 1: Create `lib/config/config.context.tsx`**

```tsx
// lib/config/config.context.tsx
"use client"

import { createContext, useContext, useEffect, useState } from "react"

import { DEEPGRAM_DEFAULTS } from "@/config/defaults/deepgram"
import { INTERVIEW_DEFAULTS } from "@/config/defaults/interview"
import { OPENAI_DEFAULTS } from "@/config/defaults/openai"
import {
  PrivateKeys,
  PrivateKeysSchema,
  UserConfig,
} from "@/config/schemas/user-config.schema"
import type { ResolvedConfig } from "@/lib/config/config.service"

const PRIVATE_KEYS_STORAGE_KEY = "app:private-keys"

interface ConfigContextValue {
  config: ResolvedConfig & { privateKeys: PrivateKeys }
  updateConfig: (patch: Partial<UserConfig>) => Promise<void>
  updatePrivateKeys: (keys: Partial<PrivateKeys>) => void
}

function buildClientBase(): ResolvedConfig {
  return {
    openai: {
      chat: { ...OPENAI_DEFAULTS.chat },
      interviewAssistant: { ...OPENAI_DEFAULTS.interviewAssistant },
      classify: { ...OPENAI_DEFAULTS.classify },
      realtime: {
        ...OPENAI_DEFAULTS.realtime,
        baseURL: OPENAI_DEFAULTS.realtime.baseFallbackURL,
      },
      transcribe: { ...OPENAI_DEFAULTS.transcribe },
      memory: { ...OPENAI_DEFAULTS.memory },
      agent: { ...OPENAI_DEFAULTS.agent },
      cache: { ...OPENAI_DEFAULTS.cache },
    },
    deepgram: { ...DEEPGRAM_DEFAULTS },
    interview: { ...INTERVIEW_DEFAULTS, vad: { ...INTERVIEW_DEFAULTS.vad } },
  }
}

function applyUserConfig(
  base: ResolvedConfig,
  userConfig: UserConfig | null
): ResolvedConfig {
  if (!userConfig) return base
  const result = {
    ...base,
    openai: {
      ...base.openai,
      chat: { ...base.openai.chat },
      realtime: { ...base.openai.realtime },
    },
    deepgram: { ...base.deepgram },
    interview: { ...base.interview },
  }
  if (userConfig.chatModel) result.openai.chat.model = userConfig.chatModel
  if (userConfig.chatTemperature != null)
    result.openai.chat.temperature = userConfig.chatTemperature
  if (userConfig.realtimeModel)
    result.openai.realtime.model = userConfig.realtimeModel
  if (userConfig.realtimeVoice)
    result.openai.realtime.voice = userConfig.realtimeVoice
  if (userConfig.deepgramModel) result.deepgram.model = userConfig.deepgramModel
  if (userConfig.deepgramLanguage)
    result.deepgram.language = userConfig.deepgramLanguage
  if (userConfig.silenceThresholdMs != null)
    result.interview.silenceThresholdMs = userConfig.silenceThresholdMs
  if (userConfig.utteranceEndMs != null)
    result.deepgram.utteranceEndMs = userConfig.utteranceEndMs
  return result
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

interface ConfigProviderProps {
  children: React.ReactNode
  // Pre-fetched on the server by the dashboard layout — null for unauthenticated pages
  initialConfig: ResolvedConfig | null
}

export function ConfigProvider({
  children,
  initialConfig,
}: ConfigProviderProps) {
  const [resolvedConfig, setResolvedConfig] = useState<ResolvedConfig>(
    initialConfig ?? buildClientBase()
  )
  const [privateKeys, setPrivateKeys] = useState<PrivateKeys>({})

  // Merge localStorage private keys after mount (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRIVATE_KEYS_STORAGE_KEY)
      if (raw) {
        const parsed = PrivateKeysSchema.safeParse(JSON.parse(raw))
        if (parsed.success) setPrivateKeys(parsed.data)
      }
    } catch {
      /* ignore parse errors */
    }
  }, [])

  async function updateConfig(patch: Partial<UserConfig>) {
    const res = await fetch("/api/user/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error("Failed to update config")
    const updated: UserConfig = await res.json()
    setResolvedConfig(applyUserConfig(buildClientBase(), updated))
  }

  function updatePrivateKeys(keys: Partial<PrivateKeys>) {
    const merged = { ...privateKeys, ...keys }
    const parsed = PrivateKeysSchema.safeParse(merged)
    if (parsed.success) {
      setPrivateKeys(parsed.data)
      localStorage.setItem(
        PRIVATE_KEYS_STORAGE_KEY,
        JSON.stringify(parsed.data)
      )
    }
  }

  return (
    <ConfigContext.Provider
      value={{
        config: { ...resolvedConfig, privateKeys },
        updateConfig,
        updatePrivateKeys,
      }}
    >
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfigContext() {
  const ctx = useContext(ConfigContext)
  if (!ctx) {
    // Outside ConfigProvider: return operator defaults with empty private keys
    return {
      config: { ...buildClientBase(), privateKeys: {} as PrivateKeys },
      updateConfig: async () => {
        throw new Error("ConfigProvider not mounted")
      },
      updatePrivateKeys: () => {},
    }
  }
  return ctx
}
```

- [ ] **Step 2: Create `lib/config/config.hooks.ts`**

```ts
// lib/config/config.hooks.ts
export { useConfigContext as useConfig } from "./config.context"
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add lib/config/
git commit -m "feat: add ConfigProvider React context and useConfig hook"
```

---

## Task 7: Mount ConfigProvider in dashboard layout

**Files:**

- Modify: `app/(dashboard)/dashboard/layout.tsx`

- [ ] **Step 1: Add ConfigProvider to dashboard layout**

Current file (`app/(dashboard)/dashboard/layout.tsx`) uses `getCurrentUser()` and renders `<SidebarProvider>`. Wrap the return with `ConfigProvider`:

```tsx
// app/(dashboard)/dashboard/layout.tsx
import { notFound } from "next/navigation"

import { ConfigProvider } from "@/lib/config/config.context"
import { ConfigService } from "@/lib/config/config.service"
import { getCurrentUser } from "@/lib/session"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { ModeToggle } from "@/components/mode-toggle"

interface DashboardLayoutProps {
  children?: React.ReactNode
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const user = await getCurrentUser()

  if (!user) {
    return notFound()
  }

  const initialConfig = await ConfigService.forUser(user.id)

  return (
    <ConfigProvider initialConfig={initialConfig}>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4 w-full">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <BreadcrumbNav />
              <div className="ml-auto">
                <ModeToggle />
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="min-h-screen flex-1 rounded-xl md:min-h-min">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ConfigProvider>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/layout.tsx
git commit -m "feat: mount ConfigProvider in dashboard layout with SSR initial config"
```

---

## Task 8: Migrate server-side API routes

**Files:**

- Modify: `app/api/assistant/completion/route.ts`
- Modify: `app/api/assistant/classify-question/route.ts`
- Modify: `app/api/transcription-session/route.ts`
- Modify: `app/api/chat/rag/stream/route.ts`
- Modify: `lib/openai/file-search-stream.ts`
- Modify: `lib/agents/interview-agents.ts`

- [ ] **Step 1: Update `app/api/assistant/completion/route.ts`**

Remove `export const runtime = "edge"` and replace `RAG_CONFIG` references with `ConfigService`:

```ts
// app/api/assistant/completion/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { ConfigService } from "@/lib/config/config.service"
import openai from "@/lib/openai"
import { buildPrompt, buildSummarizerPrompt } from "@/lib/utils"

// Note: runtime = "edge" removed — ConfigService requires Node.js (Prisma)

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const config = await ConfigService.forUser(session.user.id)
  const { backgroundText, flag, prompt: transcribe } = await req.json()

  let prompt = transcribe
  if (flag === "interview-assistant") {
    prompt = buildPrompt(backgroundText, transcribe)
  } else if (flag === "summarize") {
    prompt = buildSummarizerPrompt(transcribe)
  }

  try {
    const stream = await openai.chat.completions.create({
      model: config.openai.chat.model,
      max_tokens: config.openai.chat.maxTokens,
      temperature: config.openai.interviewAssistant.temperature,
      presence_penalty: config.openai.chat.presencePenalty,
      frequency_penalty: config.openai.chat.frequencyPenalty,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ""
          if (content) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
            )
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error(error)
    return new NextResponse("Error", { status: 500 })
  }
}
```

- [ ] **Step 2: Update `app/api/assistant/classify-question/route.ts`**

Replace all hardcoded values with `ConfigService`:

```ts
// app/api/assistant/classify-question/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { ConfigService } from "@/lib/config/config.service"
import openai from "@/lib/openai"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const config = await ConfigService.forUser(session.user.id)

  const {
    text,
    context = [],
  }: {
    text: string
    context: { role: string; content: string }[]
  } = await req.json()

  if (text.trim().split(/\s+/).length < 4) {
    return NextResponse.json({ isQuestion: false })
  }

  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    config.openai.classify.timeoutMs
  )

  try {
    const messages: {
      role: "system" | "user" | "assistant"
      content: string
    }[] = [
      {
        role: "system",
        content:
          'You are a classifier for interview transcripts. The speech may be Vietnamese, English, or mixed.\n\nDetermine if the transcript is a complete interview question worth answering.\n\nReturn only valid JSON: { "isQuestion": true } or { "isQuestion": false }\n\nReturn false for:\n- Single words or short filler sounds (yes, no, ok, ừ, uh, hmm, right, okay)\n- Incomplete fragments (trailing off mid-sentence)\n- Affirmations or acknowledgements\n\nReturn true for:\n- Complete questions requiring a substantive answer\n- Statements that clearly prompt a response',
      },
    ]

    for (const m of context.slice(-3)) {
      messages.push({
        role: m.role === "candidate" ? "assistant" : "user",
        content: m.content,
      })
    }

    messages.push({ role: "user", content: `INPUT: ${text}` })

    const response = await openai.chat.completions.create(
      {
        model: config.openai.classify.model,
        messages,
        response_format: { type: "json_object" },
        max_tokens: config.openai.classify.maxTokens,
        temperature: config.openai.classify.temperature,
      },
      { signal: controller.signal }
    )

    const result = JSON.parse(response.choices[0].message.content ?? "{}")
    return NextResponse.json({ isQuestion: result.isQuestion ?? true })
  } catch {
    return NextResponse.json({ isQuestion: true })
  } finally {
    clearTimeout(timeout)
  }
}
```

- [ ] **Step 3: Update `app/api/transcription-session/route.ts`**

```ts
// app/api/transcription-session/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { ConfigService } from "@/lib/config/config.service"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const config = await ConfigService.forUser(session.user.id)

  const response = await fetch(
    `${config.openai.realtime.baseURL}/realtime/sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.openai.realtime.model,
        voice: config.openai.realtime.voice,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error("Failed to create transcription session:", error)
    return new Response("Failed to create session", { status: 502 })
  }

  const data = await response.json()
  return NextResponse.json({ client_secret: data.client_secret.value })
}
```

Note: `process.env.OPENAI_API_KEY` is used directly here since the `env` import already validates it. Alternatively keep `import { env } from "@/env.mjs"` and use `env.OPENAI_API_KEY`.

- [ ] **Step 4: Update `lib/openai/file-search-stream.ts`**

Replace the entire file. The change adds a `modelConfig` optional parameter (so the calling route can pass resolved values — this function cannot call ConfigService itself) and removes the `RAG_CONFIG` import.

Note on naming: the OpenAI Responses API field is `max_output_tokens`, not `max_tokens`. The `modelConfig` parameter uses `maxOutputTokens` to match the API field. The calling route maps `config.openai.chat.maxTokens → maxOutputTokens` at the call site.

```ts
// lib/openai/file-search-stream.ts
import type {
  FileSearchTool,
  ResponseCompletedEvent,
  ResponseOutputTextAnnotationAddedEvent,
  ResponseTextDeltaEvent,
} from "openai/resources/responses/responses"

import { OPENAI_DEFAULTS } from "@/config/defaults/openai"
import openai from "@/lib/openai"

import { buildFileSearchFilter } from "./vector-store-service"

export interface FileSearchSource {
  documentId: string
  documentTitle: string
  quote: string
  fileId: string
}

export interface FileSearchChunk {
  content: string | null
  sources: FileSearchSource[] | null
  responseId?: string
}

/**
 * Streams a response from the OpenAI Responses API using the file_search tool.
 * Uses previous_response_id for server-side conversation state management.
 * Yields { content, sources, responseId } chunks compatible with the existing SSE handler.
 *
 * modelConfig is provided by the calling route (resolved via ConfigService).
 * Falls back to OPENAI_DEFAULTS if not provided.
 */
export async function* streamWithFileSearch(
  query: string,
  vectorStoreId: string,
  previousResponseId: string | undefined,
  documentIds?: string[],
  fileIdToTitle?: Map<string, { documentId: string; title: string }>,
  // maxOutputTokens: uses the OpenAI Responses API field name (not max_tokens)
  modelConfig?: { model: string; temperature: number; maxOutputTokens: number }
): AsyncGenerator<FileSearchChunk> {
  const filter = buildFileSearchFilter(documentIds || [])

  const fileSearchTool: FileSearchTool = {
    type: "file_search",
    vector_store_ids: [vectorStoreId],
    ...(filter ? { filters: filter as FileSearchTool["filters"] } : {}),
  }

  const stream = await openai.responses.create({
    model: modelConfig?.model ?? OPENAI_DEFAULTS.chat.model,
    instructions: `You are acting as the person whose documents are provided.
Answer every question in the first person ("I", "my", "me") as if you are that person.
Use the uploaded documents as the authoritative source of facts about yourself — experience, skills, projects, education, etc.
If the documents don't contain enough detail to answer precisely, give a natural, confident response consistent with what is known.
Never say you are an AI, a language model, or an assistant. You are the candidate.`,
    input: [{ role: "user" as const, content: query }],
    ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
    tools: [fileSearchTool],
    stream: true,
    temperature: modelConfig?.temperature ?? OPENAI_DEFAULTS.chat.temperature,
    max_output_tokens:
      modelConfig?.maxOutputTokens ?? OPENAI_DEFAULTS.chat.maxTokens,
  })

  const sources: FileSearchSource[] = []
  let sourcesYielded = false

  for await (const event of stream) {
    if (event.type === "response.output_text_annotation.added") {
      const annotationEvent =
        event as unknown as ResponseOutputTextAnnotationAddedEvent
      const annotation = annotationEvent.annotation as any
      if (annotation?.type === "file_citation") {
        const fileId: string = annotation.file_id || ""
        const quote: string = annotation.quote || ""
        const meta = fileIdToTitle?.get(fileId)
        sources.push({
          documentId: meta?.documentId || "",
          documentTitle: meta?.title || fileId,
          quote,
          fileId,
        })
      }
    }

    if (event.type === "response.output_text.delta") {
      const deltaEvent = event as ResponseTextDeltaEvent
      if (!sourcesYielded) {
        yield { content: null, sources }
        sourcesYielded = true
      }
      yield { content: deltaEvent.delta, sources: null }
    }

    if (event.type === "response.completed") {
      if (!sourcesYielded) {
        yield { content: null, sources }
        sourcesYielded = true
      }
      const completedEvent = event as unknown as ResponseCompletedEvent
      yield {
        content: null,
        sources: null,
        responseId: completedEvent.response.id,
      }
    }
  }
}
```

- [ ] **Step 5: Update `app/api/chat/rag/stream/route.ts`**

Add ConfigService call and pass config to `streamWithFileSearch`. Near the top of the `POST` handler, after `const user = await getCurrentUser()`:

```ts
import { ConfigService } from "@/lib/config/config.service"

// After user check:
const config = await ConfigService.forUser(user.id)

// Change PREV_RESP_TTL to use config:
const PREV_RESP_TTL = config.openai.cache.prevResponseTtlSec

// Update streamWithFileSearch call to pass modelConfig:
const streamIterator = streamWithFileSearch(
  message,
  vectorStoreId,
  previousResponseId ?? undefined,
  selectedDocuments || [],
  fileIdToTitle,
  {
    model: config.openai.chat.model,
    temperature: config.openai.chat.temperature,
    maxOutputTokens: config.openai.chat.maxTokens,
  }
)
```

Also remove the `const PREV_RESP_TTL = 86400` constant at the top of the file.

- [ ] **Step 6: Update `lib/agents/interview-agents.ts`**

Replace hardcoded `model: "gpt-4o-mini"` with `OPENAI_DEFAULTS.agent.answerCoachModel`:

```ts
import { OPENAI_DEFAULTS } from "@/config/defaults/openai"

// In createAnswerCoachAgent, change:
return new Agent({
  name: "AnswerCoach",
  model: OPENAI_DEFAULTS.agent.answerCoachModel,
  // ... rest unchanged
})
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add app/api/assistant/ app/api/transcription-session/ app/api/chat/ lib/openai/ lib/agents/
git commit -m "feat: migrate server-side API routes to use ConfigService"
```

---

## Task 9: Migrate client-side hooks

**Files:**

- Modify: `hooks/use-deepgram-connection.ts`
- Modify: `hooks/use-openai-transcription.ts`

- [ ] **Step 1: Update `hooks/use-deepgram-connection.ts`**

Replace all hardcoded Deepgram and interview values with `useConfig()`. The hook already imports `useInterviewSessionStore` — add `useConfig` import:

```ts
import { useConfig } from "@/lib/config/config.hooks"
```

**Important — do NOT add `config` to `useCallback` deps.** `config` is an object that changes reference on every render (after the `localStorage` effect in `ConfigProvider` fires on mount). Adding it to `initializeConnection`'s `useCallback` deps would change the function reference on that first render, and if the calling `useEffect` is ever made lint-clean (by including `initializeConnection` in its deps), the connection would be established twice on every page load.

Instead, store `config` in a ref and read `configRef.current` inside the callback. This gives the callback access to the latest config value without causing it to be recreated on config changes.

In `useDeepgramConnection`, add a config ref alongside the existing interval refs, then use it inside `initializeConnection`:

```ts
export function useDeepgramConnection(
  role: "interviewer" | "candidate" = "interviewer"
): UseDeepgramConnectionReturn {
  const { config } = useConfig()
  // Store config in a ref so initializeConnection always reads the latest value
  // without needing config in its useCallback deps (which would cause reconnects)
  const configRef = useRef(config)
  useEffect(() => { configRef.current = config }, [config])

  // ... existing state declarations ...
  const keepAliveInterval = useRef<NodeJS.Timeout>()
  const silenceInterval = useRef<NodeJS.Timeout>()

  const initializeConnection = useCallback(async () => {
    const cfg = configRef.current   // read latest config at call time
    try {
      setStatus("loading")
      const response = await fetch("/api/deepgram", { cache: "no-store" })
      const data = await response.json()

      if (!("key" in data)) {
        throw new Error("No API key returned")
      }

      const deepgram = createClient(data.key)
      const conn = deepgram.listen.live({
        model: cfg.deepgram.model,
        language: cfg.deepgram.language,
        interim_results: cfg.deepgram.interimResults,
        smart_format: cfg.deepgram.smartFormat,
        utterance_end_ms: cfg.deepgram.utteranceEndMs,
        endpointing: cfg.deepgram.endpointing,   // Deepgram API field name
      })

      keepAliveInterval.current = setInterval(() => {
        if (conn && conn.getReadyState() === 1) {
          conn.keepAlive()
        }
      }, cfg.deepgram.keepAliveIntervalMs)

      silenceInterval.current = setInterval(() => {
        const state = useInterviewSessionStore.getState()
        const silentFor = Date.now() - state.lastSpeakTime
        if (silentFor > cfg.interview.silenceThresholdMs) {
          const bufferKey = role === "interviewer" ? "interviewerBuffer" : "candidateBuffer"
          if (state[bufferKey].trim()) {
            state.flushTranscript(role)
          }
        }
      }, cfg.interview.silenceCheckIntervalMs)
      // ... rest of connection setup unchanged (event listeners, setConnection) ...
```

Keep the `useCallback` dependency array as `[role]` — do not add `config` or `configRef`.

- [ ] **Step 2: Update `hooks/use-openai-transcription.ts`**

Add `useConfig` import and replace hardcoded WebSocket URL, transcription model, and VAD params:

```ts
import { useConfig } from "@/lib/config/config.hooks"
```

In `useOpenAITranscription`, call `useConfig()` at the top:

```ts
const { config } = useConfig()
```

In the `connect` callback, replace the WebSocket URL construction:

```ts
const wsURL = `${config.openai.realtime.baseURL
  .replace(/^https/, "wss")
  .replace(/^http/, "ws")}/realtime?model=${config.openai.realtime.model}`
const ws = new WebSocket(wsURL, [
  "realtime",
  `openai-insecure-api-key.${token}`,
  "openai-beta.realtime-v1",
])
```

In `ws.onopen`, replace the `session.update` body:

```ts
ws.send(
  JSON.stringify({
    type: "session.update",
    session: {
      input_audio_format: "pcm16",
      input_audio_transcription: {
        model: config.openai.transcribe.model,
      },
      turn_detection: {
        type: "server_vad",
        silence_duration_ms: config.interview.vad.silenceDurationMs,
        threshold: config.interview.vad.threshold,
      },
    },
  })
)
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add hooks/
git commit -m "feat: migrate Deepgram and OpenAI transcription hooks to use useConfig()"
```

---

## Task 10: Delete config/rag.ts and final cleanup

**Files:**

- Delete: `config/rag.ts`

- [ ] **Step 1: Verify no remaining imports of config/rag**

```bash
grep -r "config/rag" --include="*.ts" --include="*.tsx" .
```

Expected: no results (only node_modules excluded by default)

- [ ] **Step 2: Delete `config/rag.ts`**

```bash
git rm config/rag.ts
```

- [ ] **Step 3: Final TypeScript compilation check**

Run: `pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Verify build passes**

Run: `pnpm build`
Expected: successful build with no type errors

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: delete config/rag.ts — all consumers migrated to ConfigService"
```

---

## Task 11: Smoke test

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

Expected: server starts without errors

- [ ] **Step 2: Verify dashboard loads**

Navigate to `/dashboard` in a browser while logged in.
Expected: page loads normally, no console errors about config

- [ ] **Step 3: Verify GET /api/user/config**

Open browser DevTools → Network. Reload the dashboard page and look for the `GET /api/user/config` call (triggered server-side, will appear in the server logs).

Or curl directly after login:

```bash
curl -b <session-cookie> http://localhost:3000/api/user/config
```

Expected: 200 response with `{ schemaVersion: 1, chatModel: null, ... }`

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "chore: config service implementation complete"
```
