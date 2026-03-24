export const INTERVIEW_DEFAULTS = {
  silenceThresholdMs: 5000,
  silenceCheckIntervalMs: 1000,
  vad: {
    silenceDurationMs: 1200,
    threshold: 0.5,
  },
} as const

export type InterviewDefaults = typeof INTERVIEW_DEFAULTS
