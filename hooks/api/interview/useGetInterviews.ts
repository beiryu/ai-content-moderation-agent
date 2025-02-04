import { useQuery } from "@tanstack/react-query"

import { Interview } from "@/lib/validations/interview"

const getInterviews = async (): Promise<Interview[]> => {
  const response = await fetch("/api/interviews")
  return response.json()
}

export function useGetInterviews() {
  return useQuery({
    queryKey: ["interviews"],
    queryFn: getInterviews,
  })
}
