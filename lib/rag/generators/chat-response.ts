import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatResponseRequest {
  query: string
  relevantContent: Array<{
    content: string
    metadata: any
    score: number
    source: string
  }>
  conversationContext: Array<{
    role: string
    content: string
  }>
  selectedDocuments: string[]
}

/**
 * Generate a chat response using OpenAI
 */
export async function generateChatResponse({
  query,
  relevantContent,
  conversationContext,
  selectedDocuments,
}: ChatResponseRequest): Promise<string> {
  try {
    // Prepare context from retrieved documents
    const documentContext = relevantContent
      .map(
        (content, index) =>
          `[Source ${index + 1}]: ${
            content.content
          }\n(Relevance: ${content.score.toFixed(2)})`
      )
      .join("\n\n")

    // Prepare conversation history
    const conversationHistory = conversationContext
      .slice(-6) // Keep last 6 messages for context
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n")

    // Create the system prompt
    const systemPrompt = `You are an AI assistant helping users analyze and understand their documents. You have access to relevant information from the user's uploaded documents.

Guidelines:
1. Answer questions based primarily on the provided document content
2. If information isn't available in the documents, clearly state this
3. Provide specific references to source content when possible  
4. Be conversational and helpful
5. For complex questions, break down your response into clear sections
6. Always cite your sources using [Source X] notation

Document Context:
${documentContext}

Recent Conversation:
${conversationHistory}

Current question: ${query}`

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: query,
      },
    ]

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error("No response generated from OpenAI")
    }

    return response
  } catch (error) {
    console.error("Error generating chat response:", error)
    throw new Error("Failed to generate response")
  }
}

/**
 * Generate a contextual response for document summarization
 */
export async function generateDocumentSummary(
  documents: Array<{ title: string; content: string; type: string }>,
  focusAreas?: string[]
): Promise<string> {
  try {
    const documentContent = documents
      .map((doc) => `**${doc.title}** (${doc.type}):\n${doc.content}`)
      .join("\n\n")

    const focusPrompt = focusAreas?.length
      ? `Focus particularly on: ${focusAreas.join(", ")}`
      : ""

    const systemPrompt = `You are an expert document summarizer. Provide a comprehensive yet concise summary of the provided documents.

${focusPrompt}

Create a summary that:
1. Captures key themes and main points
2. Identifies important details and insights
3. Notes any patterns or relationships across documents
4. Provides actionable takeaways if applicable

Documents:
${documentContent}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: "Please provide a comprehensive summary of these documents.",
        },
      ],
      temperature: 0.5,
      max_tokens: 1200,
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error("No summary generated from OpenAI")
    }

    return response
  } catch (error) {
    console.error("Error generating document summary:", error)
    throw new Error("Failed to generate summary")
  }
}
