import { z } from "zod";





export const InterviewSchema = z.object({
  id: z.string(),

  name: z.string(),
  status: z.string(),
  priority: z.string(),
  dueDate: z.string(),
  type: z.string(),

  createdAt: z.string(),
  updatedAt: z.string(),

  jobId: z.string().nullable(),
})

export const CreateInterviewRequestSchema = z.object({
  name: z.string(),
  type: z.string(),
  status: z.string(),
  priority: z.string(),
  dueDate: z.string(),
  jobTitle: z.string(),
  companyName: z.string(),
})

export const UpdateInterviewRequestSchema = z.object({
  id: z.string(),

  name: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  dueDate: z.string().optional(),
  type: z.string().optional(),
})

export type Interview = z.infer<typeof InterviewSchema>
export type CreateInterviewRequest = z.infer<
  typeof CreateInterviewRequestSchema
>
export type UpdateInterviewRequest = z.infer<
  typeof UpdateInterviewRequestSchema
>