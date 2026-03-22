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
          .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n") +
        "\n"
      : ""

  const systemPrompt = `You are an interview analysis assistant. Analyze the given interviewer statement and:
1. Determine if it's a question and its type (technical/behavioral/general)
2. Extract the core question
3. Classify the context type: "cold" (first question, no prior history), "follow-up" (builds on a prior exchange), or "pivot" (new unrelated topic)
4. Provide 2-3 suggested response points — if follow-up, avoid repeating what the candidate already said
5. Identify key topics/keywords
${contextSection}
Format response as JSON with fields:
{
  "question": "extracted question",
  "questionType": "technical" | "behavioral" | "general" | "other",
  "contextType": "cold" | "follow-up" | "pivot",
  "suggestedAnswerPoints": ["suggestion1", "suggestion2"],
  "keywords": ["keyword1", "keyword2"]
}

Keep responses professional and concise.`

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
