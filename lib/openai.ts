// import { createOpenAI } from "@ai-sdk/openai"

import OpenAI from "openai"

// const openai = createOpenAI({
//   apiKey: process.env.OPENAI_API_KEY || "",
//   baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
//   compatibility: "strict",
// })

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
})

export default openai
