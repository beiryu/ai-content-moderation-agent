import { useMutation, useQueryClient } from "@tanstack/react-query"

import { CreateDocumentRequest } from "@/lib/validations/document"

const uploadDocument = async (document: CreateDocumentRequest) => {
  const response = await fetch("/api/documents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(document),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to upload document")
  }
}

export default function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
    },
  })
}
