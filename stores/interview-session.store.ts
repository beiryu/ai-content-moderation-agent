import { create } from "zustand"

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

  // Session states
  currentSession: InterviewSession | null

  setMicrophoneStatus: (status: MicrophoneStatus) => void
  setCurrentSessionId: (sessionId: string | null) => void
  processTranscript: (transcript: string, isFinal: boolean, role?: "interviewer" | "candidate") => void
  flushTranscript: (role: "interviewer" | "candidate") => void
  analyzeMessage: (messageId: string) => Promise<void>
}

export const useInterviewSessionStore = create<InterviewSessionStore>()(
  (set, get) => ({
    // Transcription states
    microphoneStatus: "disconnected",
    interviewerBuffer: "",
    candidateBuffer: "",
    interimText: "",
    lastSpeakTime: Date.now(),

    messages: [],
    currentAnalysis: null,

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
        set({ currentSession: null })
      }
    },

    flushTranscript: (role: "interviewer" | "candidate") => {
      const state = get()
      const bufferKey = role === "interviewer" ? "interviewerBuffer" : "candidateBuffer"
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
            answerAnalysis: null,
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

    processTranscript: (transcript: string, isFinal: boolean, role: "interviewer" | "candidate" = "interviewer") => {
      const now = Date.now()
      const bufferKey = role === "interviewer" ? "interviewerBuffer" : "candidateBuffer"

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

      // Build context window: last 6 messages before this one
      const msgIndex = state.messages.findIndex((m) => m.id === messageId)
      const contextMessages = state.messages
        .slice(Math.max(0, msgIndex - 6), msgIndex)
        .map((m) => ({ role: m.role, content: m.content }))

      try {
        const response = await fetch("/api/assistant/analyze-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message.content, context: contextMessages }),
        })

        const analysis: QuestionAnalysis = await response.json()

        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  questionAnalysis: {
                    ...analysis,

                    createdAt: new Date(),
                    updatedAt: new Date(),

                    messageId: messageId,
                  },
                }
              : m
          ),

          currentAnalysis: analysis,
        }))
      } catch (error) {
        console.error("Error analyzing message:", error)
      }
    },
  })
)
