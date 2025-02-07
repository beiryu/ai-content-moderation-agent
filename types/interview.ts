import { InterviewSession } from "./interview-session"

export type InterviewStatus = "pending" | "in_progress" | "completed"
export type InterviewPriority = "high" | "medium" | "low"
export type InterviewType = "technical" | "behavioral" | "other"

export interface Interview {
  id: string

  name: string
  status: InterviewStatus
  priority: InterviewPriority
  dueDate: Date
  type: InterviewType

  createdAt: Date
  updatedAt: Date

  // jobId: string
  // job: Job
  interviewSessions: InterviewSession[]
}
