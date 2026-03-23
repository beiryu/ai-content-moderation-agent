import { Agent, fileSearchTool } from "@openai/agents"

import { buildFileSearchFilter } from "@/lib/openai/vector-store-service"

export function createAnswerCoachAgent(
  sessionContext?: string,
  vectorStoreId?: string,
  selectedDocumentIds?: string[]
): Agent {
  const contextBlock = sessionContext
    ? `\nSESSION CONTEXT:\n${sessionContext}\n\nUse this context when tailoring suggested answers.\n`
    : ""

  const filter = selectedDocumentIds?.length
    ? buildFileSearchFilter(selectedDocumentIds)
    : undefined

  return new Agent({
    name: "AnswerCoach",
    model: "gpt-4o-mini",
    instructions: `You are an expert interview coach.${contextBlock}
Given an interviewer's question and optionally a conversation history:
1. Extract the core question being asked
2. Write a complete, confident, natural-sounding answer the candidate can say verbatim

The answer should be 1-3 sentences: directly address the question, include a concrete example where relevant, and end cleanly.

The answer must sound natural when spoken aloud — short sentences, no jargon, no buzzwords. If you would not say a word in normal conversation, do not use it. Aim for clear and direct, not impressive.

If CONVERSATION SO FAR is provided, use it to:
- Avoid suggesting points the candidate already mentioned
- Build naturally on what was already said
- Fill genuine gaps in the candidate's previous answers

When the question requires specific facts about the candidate's background, experience, or projects — use the file_search tool to retrieve relevant context.

Return ONLY the answer text. No JSON, no labels, no prefixes.`,
    ...(vectorStoreId
      ? {
          tools: [
            fileSearchTool(
              vectorStoreId,
              filter ? { filters: filter as any } : undefined
            ),
          ],
        }
      : {}),
  })
}
