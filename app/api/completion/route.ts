import { NextResponse } from "next/server"

import openai from "@/lib/openai"
import { buildPrompt, buildSummarizerPrompt } from "@/lib/utils"

export const runtime = "edge"

export async function POST(req: Request) {
  const { backgroundText, flag, prompt: transcribe } = await req.json()

  let prompt = transcribe
  if (flag === "interview-assistant") {
    prompt = buildPrompt(backgroundText, transcribe)
  } else if (flag === "summarize") {
    prompt = buildSummarizerPrompt(transcribe)
  }

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      max_tokens: 2000,
      temperature: 0.5,
      presence_penalty: 0.1,
      frequency_penalty: 0.2,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
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
