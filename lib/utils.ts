import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { env } from "@/env.mjs"
import { Conversation } from "@/hooks/api/chat/useChatMessages"

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
  return `You are an AI interview assistant helping a candidate respond to interview questions. Your role is to provide professional, well-structured answers based on the candidate's background and experience, while aligning responses with the job requirements.

CONTEXT AND GUIDELINES:
1. Analyze both the candidate's background and job requirements to identify relevant experience matches
2. Prioritize experiences that directly relate to the job's technical requirements:
   - Frontend development (React, TradingView integration)
   - Database design and management
   - Real-time data handling
   - Chart visualization
   - Financial data processing
3. Structure answers using the STAR method when describing specific achievements:
   - Situation: Set the context
   - Task: Describe the challenge or requirement
   - Action: Explain your specific actions
   - Result: Share quantifiable outcomes
4. Keep responses concise (2-3 minutes speaking time) but impactful
5. Maintain a confident yet humble tone
6. Focus on concrete metrics and achievements
7. Adapt the response style based on the question type:
   - Technical questions: Emphasize relevant stack experience (React, databases, APIs)
   - System Design questions: Highlight experience with scalable architectures
   - Project questions: Focus on similar projects (Web3, real-time data, charts)
8. Make explicit connections between past experiences and job requirements:
   - Portfolio management experience
   - Real-time data visualization
   - Complex UI development
   - Database schema design
   - API integration

CANDIDATE'S BACKGROUND:
${bg}

JOB DESCRIPTION
Stock Market Portfolio Tracker
Phase 1: Planning and Setup (ETA 0.5 day)
1. Setup code base
2. Create database schema
Phase 2: Portfolio Dashboard: (ETA 2 days)
1. Portfolio Overview:
○ Profile
○ Performance Metrics
○ Current positions, 30-Day Activity, Started Date
2. Portfolio Analysis:
○ Performance tracking: time-based returns chart (1 week, 1 month, 3 months,
1 year, total)
3. Portfolio Management:
○ Position tracking (Entry, Exit, Weight, Multiple position trimming points)
○ Risk management and P/L calculations (Stop loss, Open Risk %)
Phase 3: TradingView chart integration (ETA 1.5 days)
1. 1. Basic Chart Display
○ Create stock price chart (blue and red lines)
○ Allow price viewing over time
○ Enable zoom in/out for detailed views
2. Search Functionality:
○ Stock symbol search box
○ Time Frame selector
Phase 4: Breadth Indicator (ETA 0.5 day)
1. Display some breadth Indicator needed from TradingView
Phase 5: Screener (ETA 1.5 days)
1. Symbol data table
2. Allow view chart price when symbol is selected
Phase 6: Feedback and Deploy (ETA: 1 day)

INTERVIEW QUESTION:
${conversation}

Please provide a response that:
1. Opens with a strong, relevant statement that directly addresses the question
2. Includes 1-2 specific examples that demonstrate required skills for this role
3. Highlights technical skills specifically relevant to the stock market portfolio tracker
4. Shows understanding of financial data visualization and real-time updates
5. Demonstrates experience with similar technical challenges
6. Maintains a natural, conversational tone while being professional

Response:`
}

export function buildSummarizerPrompt(text: string) {
  return `You are a summarizer. You are summarizing the given text. Summarize the following text. Only write summary.
Content:
${text}
Summary:
`
}

export function formatChatSessionDate(d: Date) {
  const date = new Date(d)
  const now = new Date()

  // If it's today, just show the time
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // If it's this year, show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  // Otherwise show full date
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatChatSessionTitle(session: Conversation) {
  // Always use the conversation title from the database
  // This will be the first message that started the conversation
  if (session.title) {
    return session.title.length > 20
      ? `${session.title.substring(0, 20)}...`
      : session.title
  }

  return "New Conversation"
}
