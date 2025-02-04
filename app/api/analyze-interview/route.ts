import { NextResponse } from "next/server"

import { AnalyzedQuestion } from "@/types/interview"
import openai from "@/lib/openai"

export async function POST(req: Request) {
  const { text } = await req.json()

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        {
          role: "system",
          content: `You are an interview analysis assistant. Analyze the given text and:
            1. Determine if it's a question and its type (technical/behavioral/general)
            2. Extract the core question
            3. Provide 2-3 suggested responses
            4. Identify key topics/keywords
            
            Format response as JSON with fields:
            {
              "type": "technical" | "behavioral" | "general" | "other",
              "question": "extracted question",
              "suggestions": ["suggestion1", "suggestion2"],
              "keywords": ["keyword1", "keyword2"]
            }
            
            Keep responses professional and concise.`,
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
    const analysis = JSON.parse(content) as AnalyzedQuestion
    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Error analyzing interview:", error)
    return new NextResponse("Error analyzing interview", { status: 500 })
  }
}
