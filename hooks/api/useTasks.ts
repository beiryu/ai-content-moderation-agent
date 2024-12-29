import { TASKS_MOCK } from "@/mocks"
import { useQuery } from "@tanstack/react-query"

import { TaskType } from "@/lib/validations/task"

export function useTasks() {
  return useQuery<TaskType[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks`, {
        method: "GET",
      })
      return response.json()
    },
    initialData: TASKS_MOCK,
  })
}
