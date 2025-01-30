import { NextResponse } from "next/server"
import { streamText } from "ai"

import openai from "@/lib/openai"
import { buildPrompt, buildSummarizerPrompt } from "@/lib/utils"

export const runtime = "edge"
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo-1106"

export async function POST(req: Request) {
  const { backgroundText, flag, prompt: transcribe } = await req.json()

  let prompt = transcribe
  if (flag === "interview-assistant") {
    prompt = buildPrompt(backgroundText, transcribe)
  } else if (flag === "summarize") {
    prompt = buildSummarizerPrompt(transcribe)
  }

  try {
    const result = await streamText({
      model: openai(MODEL),
      maxTokens: 2000,
      temperature: 0.5,
      presencePenalty: 0.1,
      frequencyPenalty: 0.2,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error(error)
    return new NextResponse("Error", { status: 500 })
  }
}
