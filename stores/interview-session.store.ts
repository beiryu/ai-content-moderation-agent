import { useChatDocumentStore } from "@/stores/chat-document-store"
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
  sessionContext: string

  setMicrophoneStatus: (status: MicrophoneStatus) => void
  setCurrentSessionId: (sessionId: string | null) => void
  setSessionContext: (ctx: string) => void
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
      sessionContext: "",

      // Actions
      setMicrophoneStatus: (status) => set({ microphoneStatus: status }),
      setSessionContext: (ctx) => set({ sessionContext: ctx }),

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
          set({ currentSession: null, agentHistory: [], sessionContext: "" })
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

        // Show card immediately with empty answer
        const initialAnalysis = {
          id: messageId,
          question: message.content,
          suggestedAnswer: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          messageId,
        }
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...m, questionAnalysis: initialAnalysis } : m
          ),
          currentAnalysis: initialAnalysis,
        }))

        const currentIndex = state.messages.findIndex((m) => m.id === messageId)
        const context = state.messages
          .slice(Math.max(0, currentIndex - 6), currentIndex)
          .map((m) => ({ role: m.role, content: m.content }))

        try {
          const selectedDocuments =
            useChatDocumentStore.getState().coachDocuments

          const response = await fetch("/api/assistant/question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: message.content,
              agentHistory: get().agentHistory,
              context,
              sessionContext: get().sessionContext,
              selectedDocuments,
            }),
          })

          const reader = response.body!.getReader()
          const decoder = new TextDecoder()
          let buffer = ""

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""

            for (const line of lines) {
              if (!line.trim()) continue
              const event = JSON.parse(line)
              if (event.type === "delta") {
                set((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === messageId && m.questionAnalysis
                      ? {
                          ...m,
                          questionAnalysis: {
                            ...m.questionAnalysis,
                            suggestedAnswer:
                              m.questionAnalysis.suggestedAnswer + event.text,
                          },
                        }
                      : m
                  ),
                }))
              } else if (event.type === "done") {
                set({ agentHistory: event.updatedHistory })
              }
            }
          }
        } catch (error) {
          console.error("Error streaming answer:", error)
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
