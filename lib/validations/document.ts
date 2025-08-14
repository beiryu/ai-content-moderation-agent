import { DocumentType } from "@prisma/client"
import { z } from "zod"

export const DocumentSchema = z.object({
  id: z.string(),

  userId: z.string(),
  title: z.string(),
  type: z.nativeEnum(DocumentType),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  fileUrl: z.string().optional(),
  chunks: z.any(),

  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Document = z.infer<typeof DocumentSchema>

/**
 * Schema for document creation request
 */
export const CreateDocumentRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  type: z.nativeEnum(DocumentType),
  content: z.string().min(10, "Content must be at least 10 characters long"),
  metadata: z.record(z.any()).optional(),
})

export type CreateDocumentRequest = z.infer<typeof CreateDocumentRequestSchema>

/**
 * Schema for document update request
 */
export const UpdateDocumentRequestSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(10).optional(),
  metadata: z.record(z.any()).optional(),
})

export type UpdateDocumentRequest = z.infer<typeof UpdateDocumentRequestSchema>
