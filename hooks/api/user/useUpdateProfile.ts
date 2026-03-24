import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"

import { UserProfile } from "@/lib/validations/user"
import { toast } from "@/components/ui/use-toast"

interface UpdateProfilePayload extends UserProfile {
  userId: string
}

const updateProfile = async ({
  userId,
  ...payload
}: UpdateProfilePayload): Promise<void> => {
  const response = await fetch(`/api/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response?.ok) {
    throw new Error("Failed to update profile")
  }
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { update } = useSession()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: async (_, variables) => {
      // Update session with new data
      await update({
        name: variables.name,
        email: variables.email,
      })

      toast({
        description: "Your profile has been updated successfully.",
      })

      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: ["user"] })

      router.refresh()
    },
    onError: (error) => {
      toast({
        title: "Something went wrong.",
        description: "Your profile was not updated. Please try again.",
        variant: "destructive",
      })
    },
  })
}
