import type { AgentInputItem } from "@openai/agents"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import { InterviewMessage, QuestionAnalysis } from "@/types/interview-message"
import { InterviewSession, MicrophoneStatus } from "@/types/interview-session"

interface InterviewSessionStore {
  // Transcription states
  microphoneStatus: MicrophoneStatus
  interviewerBuffer: string
  candidateBuffer: string
  interimText: string
  lastSpeakTime: number

  messages: InterviewMessage[]
  currentAnalysis: QuestionAnalysis | null

  // Agent memory
  agentHistory: AgentInputItem[]

  // Session states
  currentSession: InterviewSession | null

  setMicrophoneStatus: (status: MicrophoneStatus) => void
  setCurrentSessionId: (sessionId: string | null) => void
  processTranscript: (
    transcript: string,
    isFinal: boolean,
    role?: "interviewer" | "candidate"
  ) => void
  flushTranscript: (role: "interviewer" | "candidate") => void
  analyzeMessage: (messageId: string) => Promise<void>
}

export const useInterviewSessionStore = create<InterviewSessionStore>()(
  persist(
    (set, get) => ({
      // Transcription states
      microphoneStatus: "disconnected",
      interviewerBuffer: "",
      candidateBuffer: "",
      interimText: "",
      lastSpeakTime: Date.now(),

      messages: [],
      currentAnalysis: null,

      // Agent memory
      agentHistory: [],

      // Session states
      currentSession: null,

      // Actions
      setMicrophoneStatus: (status) => set({ microphoneStatus: status }),

      setCurrentSessionId: (sessionId) => {
        if (sessionId) {
          set((state) => ({
            currentSession: {
              id: sessionId,

              completionRate: 0,
              performanceScore: 0,
              feedbackSummary: "",
              duration: 0,
              status: "active",

              createdAt: new Date(),
              updatedAt: new Date(),

              interviewId: "",
              messages: state.messages,
            },
          }))
        } else {
          set({ currentSession: null, agentHistory: [] })
        }
      },

      flushTranscript: (role: "interviewer" | "candidate") => {
        const state = get()
        const bufferKey =
          role === "interviewer" ? "interviewerBuffer" : "candidateBuffer"
        const buffer = state[bufferKey].trim()
        if (!buffer) return

        const messageId = Date.now().toString()
        set({
          messages: [
            ...state.messages,
            {
              id: messageId,
              role,
              content: buffer,
              messageType: "other",
              questionAnalysis: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              sessionId: state.currentSession?.id ?? "",
            },
          ],
          [bufferKey]: "",
          interimText: "",
        })

        if (role === "interviewer") {
          get().analyzeMessage(messageId)
        }
      },

      processTranscript: (
        transcript: string,
        isFinal: boolean,
        role: "interviewer" | "candidate" = "interviewer"
      ) => {
        const now = Date.now()
        const bufferKey =
          role === "interviewer" ? "interviewerBuffer" : "candidateBuffer"

        if (isFinal) {
          set((state) => ({
            [bufferKey]: (state[bufferKey] + " " + transcript).trim(),
            lastSpeakTime: now,
          }))
        } else {
          set({
            interimText: transcript,
            lastSpeakTime: now,
          })
        }
      },

      analyzeMessage: async (messageId: string) => {
        const state = get()
        const message = state.messages.find((m) => m.id === messageId)

        if (!message) return

        try {
          const currentIndex = state.messages.findIndex((m) => m.id === messageId)
          const context = state.messages
            .slice(Math.max(0, currentIndex - 6), currentIndex)
            .map((m) => ({ role: m.role, content: m.content }))

          const response = await fetch("/api/assistant/question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: message.content,
              agentHistory: state.agentHistory,
              context,
            }),
          })

          const { question, suggestedAnswer, updatedHistory } =
            await response.json()

          set((state) => ({
            agentHistory: updatedHistory,
            messages: state.messages.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    questionAnalysis: {
                      id: messageId,
                      question,
                      suggestedAnswer,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      messageId,
                    },
                  }
                : m
            ),
            currentAnalysis: {
              id: messageId,
              question,
              suggestedAnswer,
              createdAt: new Date(),
              updatedAt: new Date(),
              messageId,
            },
          }))
        } catch (error) {
          console.error("Error analyzing message:", error)
        }
      },
    }),
    {
      name: "interview-agent-history",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ agentHistory: state.agentHistory }),
    }
  )
)
