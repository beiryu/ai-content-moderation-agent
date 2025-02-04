import { useMutation } from "@tanstack/react-query"

import {
  InterviewSession,
  UpdateInterviewSessionRequest,
} from "@/lib/validations/interview-session"

const updateInterviewSession = async (
  payload: UpdateInterviewSessionRequest
): Promise<InterviewSession> => {
  const response = await fetch(`/api/interview-sessions/${payload.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export function useUpdateInterviewSession() {
  return useMutation({
    mutationFn: updateInterviewSession,
  })
}
