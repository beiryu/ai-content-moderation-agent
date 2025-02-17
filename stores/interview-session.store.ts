import { create } from "zustand"

import { InterviewMessage, QuestionAnalysis } from "@/types/interview-message"
import { InterviewSession, MicrophoneStatus } from "@/types/interview-session"

interface InterviewSessionStore {
  // Transcription states
  microphoneStatus: MicrophoneStatus
  transcriptionBuffer: string
  interimText: string
  lastSpeakTime: number

  messages: InterviewMessage[]
  currentAnalysis: QuestionAnalysis | null

  // Session states
  currentSession: InterviewSession | null

  setMicrophoneStatus: (status: MicrophoneStatus) => void
  setCurrentSessionId: (sessionId: string | null) => void
  processTranscript: (transcript: string, isFinal: boolean) => void
  analyzeMessage: (messageId: string) => Promise<void>
}

export const useInterviewSessionStore = create<InterviewSessionStore>()(
  (set, get) => ({
    // Transcription states
    microphoneStatus: "disconnected",
    transcriptionBuffer: "",
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

    processTranscript: (transcript: string, isFinal: boolean) => {
      const now = Date.now()
      const SILENCE_THRESHOLD = 3000
      const state = get()
      const timeSinceLastSpeak = now - state.lastSpeakTime

      // Check silence threshold first
      if (
        timeSinceLastSpeak > SILENCE_THRESHOLD &&
        state.transcriptionBuffer.trim()
      ) {
        const messageId = Date.now().toString()
        const messageText = state.transcriptionBuffer.trim()

        set({
          messages: [
            ...state.messages,
            {
              id: messageId,

              role: "interviewer",
              content: messageText,
              messageType: "other",
              questionAnalysis: null,
              answerAnalysis: null,
              createdAt: new Date(),
              updatedAt: new Date(),

              sessionId: state.currentSession?.id ?? "",
            },
          ],
          transcriptionBuffer: isFinal ? transcript : "",
          interimText: isFinal ? "" : transcript,
          lastSpeakTime: now,
        })

        get().analyzeMessage(messageId)
        return
      }

      // If not enough silence, update buffer or interim
      if (isFinal) {
        set((state) => ({
          transcriptionBuffer: (
            state.transcriptionBuffer +
            " " +
            transcript
          ).trim(),
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
        const response = await fetch("/api/assistant/analyze-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message.content }),
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
