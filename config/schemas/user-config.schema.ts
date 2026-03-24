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
