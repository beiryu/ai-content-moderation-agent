"use client"

import { createContext, useContext, useEffect, useState } from "react"

import { DEEPGRAM_DEFAULTS } from "@/config/defaults/deepgram"
import { INTERVIEW_DEFAULTS } from "@/config/defaults/interview"
import { OPENAI_DEFAULTS } from "@/config/defaults/openai"
import {
  PrivateKeysSchema,
  type PrivateKeys,
  type UserConfig,
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
      classify: { ...OPENAI_DEFAULTS.classify },
      realtime: {
        ...OPENAI_DEFAULTS.realtime,
        baseURL: OPENAI_DEFAULTS.realtime.baseFallbackURL,
      },
      transcribe: { ...OPENAI_DEFAULTS.transcribe },
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
    interview: { ...base.interview, vad: { ...base.interview.vad } },
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
  if (userConfig.deepgramEndpointing != null)
    result.deepgram.endpointing = userConfig.deepgramEndpointing
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
    setResolvedConfig((prev) => {
      const merged = applyUserConfig(buildClientBase(), updated)
      // Preserve server-resolved OpenAI base URL (env) after API round-trip
      if (prev?.openai.realtime.baseURL) {
        merged.openai.realtime.baseURL = prev.openai.realtime.baseURL
      }
      return merged
    })
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
