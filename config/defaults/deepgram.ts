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
