import { useMutation, useQueryClient } from "@tanstack/react-query"

const deleteInterview = async (id: string): Promise<void> => {
  await fetch(`/api/interviews/${id}`, {
    method: "DELETE",
  })
}

export function useDeleteInterview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] })
    },
  })
}
