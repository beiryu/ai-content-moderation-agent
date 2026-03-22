import { NextResponse } from "next/server"
import { MemorySession, OpenAIResponsesCompactionSession, run } from "@openai/agents"
import type { AgentInputItem } from "@openai/agents"

import { answerCoachAgent } from "@/lib/agents/interview-agents"

export async function POST(req: Request) {
  const {
    text,
    agentHistory = [],
    context = [],
  }: {
    text: string
    agentHistory: AgentInputItem[]
    context: { role: string; content: string }[]
  } = await req.json()

  const contextBlock =
    context.length > 0
      ? "CONVERSATION SO FAR:\n" +
        context
          .map(
            (m) =>
              `${m.role === "interviewer" ? "INTERVIEWER" : "YOU SAID"}: ${m.content}`
          )
          .join("\n") +
        "\n\n"
      : ""

  const input = `${contextBlock}NEW QUESTION FROM INTERVIEWER: ${text}`

  const memorySession = new MemorySession({ initialItems: agentHistory })
  const session = new OpenAIResponsesCompactionSession({
    underlyingSession: memorySession,
    shouldTriggerCompaction: ({ compactionCandidateItems }) =>
      compactionCandidateItems.length >= 12,
  })

  try {
    const result = await run(answerCoachAgent, input, { session })
    const updatedHistory = await session.getItems()
    const output = JSON.parse(result.finalOutput as string) as {
      question: string
      suggestedAnswer: string
    }
    return NextResponse.json({ ...output, updatedHistory })
  } catch (error) {
    console.error("Error running answer coach agent:", error)
    return new NextResponse("Error analyzing interview", { status: 500 })
  }
}
