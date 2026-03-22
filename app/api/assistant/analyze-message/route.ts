import { NextResponse } from "next/server"

import { QuestionAnalysis } from "@/types/interview-message"
import { RAG_CONFIG } from "@/config/rag"
import openai from "@/lib/openai"

export async function POST(req: Request) {
  const { text, context = [] } = await req.json()

  const contextSection =
    context.length > 0
      ? `\nCONVERSATION HISTORY (last ${context.length} messages):\n` +
        context
          .map(
            (m: { role: string; content: string }) =>
              `${m.role.toUpperCase()}: ${m.content}`
          )
          .join("\n") +
        "\n"
      : ""

  const systemPrompt = `You are an expert interview coach. Given an interviewer's statement and conversation history:
1. Extract the core question being asked
2. Write a complete, confident, natural-sounding answer the candidate can say verbatim
${contextSection}
The answer should be 1-3 sentences: directly address the question, include a concrete example or detail where relevant, and end cleanly.

Format response as JSON:
{
  "question": "the extracted question",
  "suggestedAnswer": "full answer text here"
}`

  try {
    const response = await openai.chat.completions.create({
      model: RAG_CONFIG.models.chat.analysis,
      messages: [
        {
          role: "system",
          content: systemPrompt,
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
