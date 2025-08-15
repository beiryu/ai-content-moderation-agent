import { NextResponse } from "next/server"

import { QuestionAnalysis } from "@/types/interview-message"
import { RAG_CONFIG } from "@/config/rag"
import openai from "@/lib/openai"

export async function POST(req: Request) {
  const { text } = await req.json()

  try {
    const response = await openai.chat.completions.create({
      model: RAG_CONFIG.models.chat.analysis,
      messages: [
        {
          role: "system",
          content: RAG_CONFIG.prompts.interviewAnalysis,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0].message.content!
    const analysis = JSON.parse(content) as QuestionAnalysis
    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Error analyzing interview:", error)
    return new NextResponse("Error analyzing interview", { status: 500 })
  }
}
