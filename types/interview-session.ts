import { InterviewMessage } from "./interview-message"

export type InterviewSessionStatus = "active" | "completed" | "paused"
export type MicrophoneStatus = "disconnected" | "connecting" | "connected"

export interface InterviewSession {
  id: string

  analysis?: Record<string, any>
  metadata?: Record<string, any>

  completionRate: number
  performanceScore: number
  feedbackSummary: string
  duration: number
  status: InterviewSessionStatus

  createdAt: Date
  updatedAt: Date

  interviewId: string
  messages: InterviewMessage[]
  // performance?: InterviewSessionPerformance
}
