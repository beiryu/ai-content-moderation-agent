import * as z from "zod"

export const UserNameSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(32, "Name must be less than 32 characters"),
})

export const UserProfileSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(32, "Name must be less than 32 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional().nullable(),
})

export const DeleteAccountSchema = z.object({
  confirmText: z.string().refine((val) => val === "DELETE", {
    message: "Please type DELETE to confirm",
  }),
})

export type UserProfile = z.infer<typeof UserProfileSchema>
export type DeleteAccount = z.infer<typeof DeleteAccountSchema>
