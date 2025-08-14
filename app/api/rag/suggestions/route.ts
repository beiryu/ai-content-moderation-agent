import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { generateResponseSuggestions } from "@/lib/rag/system"
import { getCurrentUser } from "@/lib/session"

const generateSuggestionsSchema = z.object({
  sessionId: z.string().min(1),
  question: z.string().min(1),
  interviewType: z.string().optional(),
})

/**
 * POST /api/rag/suggestions
 * Generate response suggestions for an interview question
 */
export async function POST(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate request body
    const body = await req.json()
    const { sessionId, question, interviewType } =
      generateSuggestionsSchema.parse(body)

    // Generate suggestions
    const suggestions = await generateResponseSuggestions(
      user.id,
      sessionId,
      question,
      interviewType
    )

    return NextResponse.json({
      success: true,
      suggestions: suggestions.suggestions,
      relevantExperience: suggestions.relevantExperience,
      frameworks: suggestions.frameworks,
      hasContext: suggestions.context.length > 0,
    })
  } catch (error) {
    console.error("Error generating suggestions:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
