import { z } from "zod"

export const InterviewMessageSchema = z.object({
  id: z.string(),

  timestamp: z.string(),
  role: z.string(),
  content: z.string(),
  messageType: z.string(),

  createdAt: z.string(),
  updatedAt: z.string(),

  sessionId: z.string().nullable(),
})

export const QuestionAnalysisSchema = z.object({
  id: z.string(),

  questionType: z.string(),
  difficulty: z.number(),
  topics: z.array(z.string()),
  suggestedAnswerPoints: z.array(z.string()),
  keywords: z.array(z.string()),

  createdAt: z.string(),
  updatedAt: z.string(),

  messageId: z.string(),
})

export const AnswerAnalysisSchema = z.object({
  id: z.string(),

  relevanceScore: z.number(),
  completenessScore: z.number(),
  clarityScore: z.number(),
  technicalAccuracy: z.number().nullable(),

  coveredPoints: z.array(z.string()),
  missedPoints: z.array(z.string()),
  improvements: z.array(z.string()),

  createdAt: z.string(),
  updatedAt: z.string(),

  messageId: z.string(),
})

export type InterviewMessage = z.infer<typeof InterviewMessageSchema>
export type QuestionAnalysis = z.infer<typeof QuestionAnalysisSchema>
export type AnswerAnalysis = z.infer<typeof AnswerAnalysisSchema>
