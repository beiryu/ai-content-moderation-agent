import { ChatMessage } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";



import { RagChatRequest } from "@/lib/validations/chat-message";





export interface OptimisticMessage extends ChatMessage {
  error?: boolean
}

// Fetch messages for a conversation
const getSessionMessages = async (
  sessionId?: string
): Promise<ChatMessage[]> => {
  if (!sessionId) return []

  const response = await fetch(`/api/chat/conversations/${sessionId}/messages`)

  if (!response.ok) {
    throw new Error("Failed to fetch messages")
  }

  return response.json()
}

// Hook for fetching messages
export function useRagChatMessages(sessionId?: string) {
  return useQuery({
    queryKey: ["chatMessages", sessionId],
    queryFn: () => getSessionMessages(sessionId),
    enabled: !!sessionId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Consider data always stale, so it refetches
  })
}

// Send a message to the RAG chat endpoint
const sendRagChatMessage = async (
  request: RagChatRequest
): Promise<ChatMessage> => {
  const response = await fetch("/api/chat/rag", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error("Failed to get response")
  }

  return response.json()
}

// Hook for sending messages
export function useSendRagChatMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sendRagChatMessage,
    onMutate: async (variables) => {
      // Create optimistic user message to show immediately
      const tempId = uuidv4()
      const optimisticUserMessage = {
        id: tempId,
        content: variables.message,
        role: "user",
        createdAt: new Date(),
        conversationId: variables.sessionId,
      }

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({
        queryKey: ["chatMessages", variables.sessionId],
      })

      // Snapshot the previous messages
      const previousMessages =
        queryClient.getQueryData(["chatMessages", variables.sessionId]) || []

      // Optimistically update the cache with our new message
      queryClient.setQueryData(
        ["chatMessages", variables.sessionId],
        (old: OptimisticMessage[] = []) => {
          return [...old, optimisticUserMessage]
        }
      )

      // Return context with the optimistic message and previous messages
      return { previousMessages, tempId }
    },
    onSuccess: (data, variables, context) => {
      if (data.conversationId) {
        // Remove the optimistic message as the real one will be fetched
        queryClient.setQueryData(
          ["chatMessages", data.conversationId],
          (old: OptimisticMessage[] = []) => {
            // Filter out the temporary message
            return old.filter((msg) => msg.id !== context?.tempId)
          }
        )

        // Invalidate to get fresh data including the AI response
        queryClient.invalidateQueries({
          queryKey: ["chatMessages", data.conversationId],
        })

        // Also invalidate any session lists to ensure new conversations appear
        queryClient.invalidateQueries({
          queryKey: ["conversations"],
        })
      }
    },
    onError: (error, variables, context) => {
      // Revert to previous messages on error, but mark the user message as error
      if (variables.sessionId && context) {
        queryClient.setQueryData(
          ["chatMessages", variables.sessionId],
          (old: OptimisticMessage[] = []) => {
            return old.map((msg) => {
              if (msg.id === context.tempId) {
                return { ...msg, error: true }
              }
              return msg
            })
          }
        )
      }
      console.error("Error sending message:", error)
    },
  })
}