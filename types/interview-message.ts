export type RoleType = "interviewer" | "candidate" | "ai" | "system"
export type MessageType =
  | "question"
  | "answer"
  | "feedback"
  | "suggestion"
  | "other"

export interface InterviewMessage {
  id: string

  role: RoleType
  content: string
  messageType: MessageType
  questionAnalysis: QuestionAnalysis | null
  answerAnalysis: AnswerAnalysis | null

  createdAt: Date
  updatedAt: Date

  sessionId: string
}

export interface QuestionAnalysis {
  id: string

  question: string
  suggestedAnswer: string

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
