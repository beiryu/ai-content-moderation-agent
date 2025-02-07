import { z } from "zod"

import { InterviewMessageSchema } from "./interview-message"

export const InterviewSessionSchema = z.object({
  id: z.string(),

  analysis: z.record(z.any()),
  metadata: z.record(z.any()),

  completionRate: z.number(),
  performanceScore: z.number(),
  feedbackSummary: z.string(),
  duration: z.number(),
  status: z.string(),

  createdAt: z.string(),
  updatedAt: z.string(),

  interviewId: z.string(),
  messages: z.array(InterviewMessageSchema),
})

export type InterviewSession = z.infer<typeof InterviewSessionSchema>
