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
    const streamed = await run(answerCoachAgent, input, { session, stream: true })

    const encoder = new TextEncoder()
    const body = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamed) {
            if (
              event.type === "raw_model_stream_event" &&
              event.data.type === "output_text_delta"
            ) {
              const chunk =
                JSON.stringify({ type: "delta", text: (event.data as { delta: string }).delta }) + "\n"
              controller.enqueue(encoder.encode(chunk))
            }
          }
          const updatedHistory = await session.getItems()
          const done =
            JSON.stringify({ type: "done", updatedHistory }) + "\n"
          controller.enqueue(encoder.encode(done))
        } catch (err) {
          console.error("Stream error:", err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(body, {
      headers: { "Content-Type": "application/x-ndjson" },
    })
  } catch (error) {
    console.error("Error running answer coach agent:", error)
    return new Response("Error analyzing interview", { status: 500 })
  }
}
