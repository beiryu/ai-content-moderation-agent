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
