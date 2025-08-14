import * as z from "zod"

export const RagChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  selectedDocuments: z
    .array(z.string().min(1))
    .min(1, "At least one document must be selected"),
  sessionId: z.string().optional(),
  options: z
    .object({
      tonePreference: z
        .enum(["professional", "conversational", "technical", "simple"])
        .optional(),
      includeCitations: z.boolean().optional(),
    })
    .optional(),
})

export type RagChatRequest = z.infer<typeof RagChatRequestSchema>
