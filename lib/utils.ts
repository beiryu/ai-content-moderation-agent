import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { env } from "@/env.mjs"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(input: string | number): string {
  const date = new Date(input)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function absoluteUrl(path: string) {
  return `${env.NEXT_PUBLIC_APP_URL}${path}`
}

export function buildPrompt(bg: string | undefined, conversation: string) {
  return `You are a interview assistant. You are assisting in writing responses to the interviewee's answers. You have access to the interview conversation and the background information for the interview. Write a direct response to the interviewee's question, without including any information about yourself. Create Short Response and donot create background and conversation.
--------------------------------
BACKGROUND: ${bg}
--------------------------------
CONVERSATION: ${conversation}
--------------------------------
Response:`
}

export function buildSummarizerPrompt(text: string) {
  return `You are a summarizer. You are summarizing the given text. Summarize the following text. Only write summary.
Content:
${text}
Summary:
`
}
