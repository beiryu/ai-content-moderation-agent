// Operator defaults — safe for edge runtime (plain objects, no Node.js imports)
export { OPENAI_DEFAULTS } from "./defaults/openai"
export { DEEPGRAM_DEFAULTS } from "./defaults/deepgram"
export { INTERVIEW_DEFAULTS } from "./defaults/interview"
export { siteConfig } from "./defaults/site"

// Schemas — safe for edge runtime (Zod only, no Node.js imports)
export {
  UserConfigSchema,
  UserConfigSchemaV1,
  CURRENT_SCHEMA_VERSION,
  configMigrations,
  PrivateKeysSchema,
} from "./schemas/user-config.schema"
export type { UserConfig, PrivateKeys } from "./schemas/user-config.schema"
