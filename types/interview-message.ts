export type QuestionType = "technical" | "behavioral" | "general" | "other"
export type RoleType = "interviewer" | "candidate" | "ai" | "system"
export type MessageType = "question" | "answer" | "feedback" | "suggestion"

export interface InterviewMessage {
  id: string

  timestamp: Date
  role: RoleType
  content: string
  messageType: MessageType

  createdAt: Date
  updatedAt: Date

  sessionId: string
}

export interface QuestionAnalysis {
  id: string

  questionType: QuestionType
  difficulty: number
  topics: string[]
  suggestedAnswerPoints: string[]
  keywords: string[]

  createdAt: Date
  updatedAt: Date

  messageId: string
}

export interface AnswerAnalysis {
  id: string

  relevanceScore: number
  completenessScore: number
  clarityScore: number
  technicalAccuracy?: number

  coveredPoints: string[]
  missedPoints: string[]
  improvements: string[]

  metadata?: Record<string, any>

  messageId: string

  createdAt: Date
  updatedAt: Date
}
