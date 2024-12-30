import { useQuery } from "@tanstack/react-query"

import { Interview } from "@/lib/validations/interview"

const getInterview = async (interviewId: string): Promise<Interview> => {
  const response = await fetch(`/api/interviews/${interviewId}`, {
    method: "GET",
  })
  return response.json()
}

export function useGetInterview(interviewId: string) {
  return useQuery({
    queryKey: ["interviews", interviewId],
    queryFn: () => getInterview(interviewId),
  })
}
