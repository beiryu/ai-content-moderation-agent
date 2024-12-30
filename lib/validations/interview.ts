import { z } from "zod"

export const InterviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  priority: z.string(),
  dueDate: z.string(),
  type: z.string(),
  jobId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Interview = z.infer<typeof InterviewSchema>

export const CreateInterviewRequestSchema = z.object({
  name: z.string(),
  status: z.string(),
  priority: z.string(),
  dueDate: z.string(),
  type: z.string(),
})

// Update Interview Request Schema
export const UpdateInterviewRequestSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  dueDate: z.string().optional(),
  type: z.string().optional(),
})

export type CreateInterviewRequest = z.infer<
  typeof CreateInterviewRequestSchema
>
export type UpdateInterviewRequest = z.infer<
  typeof UpdateInterviewRequestSchema
>
