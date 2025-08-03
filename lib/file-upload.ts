/**
 * File Upload Utility
 * Handles file uploads and content extraction
 */

import { toast } from "@/components/ui/use-toast"

export interface FileUploadResult {
  title?: string
  content?: string
  error?: string
}

/**
 * Handle file upload and content extraction
 */
export const handleFileUpload = async (
  file: File,
  onSuccess: (result: FileUploadResult) => void,
  onError: (message: string) => void
): Promise<void> => {
  // Validate file size (10MB max)
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_FILE_SIZE) {
    toast({
      title: "File too large",
      description: "Please upload a file smaller than 10MB",
      variant: "destructive",
    })
    onError("File size exceeds maximum allowed (10MB)")
    return
  }

  // Validate file type
  const allowedTypes = [
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ]

  if (!allowedTypes.includes(file.type) && !file.name.endsWith(".docx")) {
    toast({
      title: "Invalid file type",
      description: "Please upload a PDF, DOC, DOCX, or TXT file",
      variant: "destructive",
    })
    onError("Invalid file type")
    return
  }

  try {
    // Extract title from filename
    let title = file.name.split(".").slice(0, -1).join(".")
    if (!title) title = file.name

    // For text files, read directly
    if (file.type === "text/plain") {
      const content = await file.text()
      onSuccess({ title, content })
      return
    }

    // For other file types, create form data to send to server
    const formData = new FormData()
    formData.append("file", file)

    // Send to file extraction API
    const response = await fetch("/api/documents/extract", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to extract content from file")
    }

    const result = await response.json()
    onSuccess({
      title,
      content: result.content,
    })
  } catch (error) {
    console.error("File upload error:", error)

    toast({
      title: "Content extraction failed",
      description: "Could not extract text from the uploaded file.",
      variant: "destructive",
    })

    onError(error instanceof Error ? error.message : "File processing failed")
  }
}
