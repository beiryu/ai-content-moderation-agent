import { useMutation } from "@tanstack/react-query"

import {
  CreateInterviewSessionRequest,
  InterviewSession,
} from "@/lib/validations/interview-session"

const createInterviewSession = async (
  payload: CreateInterviewSessionRequest
): Promise<InterviewSession> => {
  const response = await fetch("/api/interview-sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return response.json()
}

const useCreateInterviewSession = () => {
  return useMutation({
    mutationFn: createInterviewSession,
  })
}

export default useCreateInterviewSession
