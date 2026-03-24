import OpenAI from "openai"

import { env } from "@/env.mjs"

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY || "",
  baseURL: env.OPENAI_BASE_URL || "https://api.openai.com/v1",
})

export default openai
