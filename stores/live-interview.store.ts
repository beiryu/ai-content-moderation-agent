import { create } from "zustand"

interface InterviewMessage {
  id: string
  timestamp: Date
  text: string
}

interface LiveInterviewStore {
  transcribedText: string
  interimText: string
  messages: InterviewMessage[]
  microphoneStatus: "disconnected" | "connecting" | "connected"

  addTranscribedText: (transcribedText: string) => void
  clearTranscribedText: () => void
  setTranscribedText: (transcribedText: string) => void
  setInterimText: (interimText: string) => void
  addMessage: (transcribedText: string) => void
  setMicrophoneStatus: (
    status: "disconnected" | "connecting" | "connected"
  ) => void
}

export const useLiveInterviewStore = create<LiveInterviewStore>()((set) => ({
  transcribedText: "",
  interimText: "",
  messages: [],
  microphoneStatus: "disconnected",

  addTranscribedText: (transcribedText) =>
    set((state) => ({
      transcribedText: state.transcribedText + transcribedText,
    })),
  clearTranscribedText: () => set({ transcribedText: "" }),
  setInterimText: (interimText) => set({ interimText }),
  setTranscribedText: (transcribedText) => set({ transcribedText }),
  addMessage: (transcribedText) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: Date.now().toString(),
          timestamp: new Date(),
          text: transcribedText,
        },
      ],
    })),
  setMicrophoneStatus: (status) => set({ microphoneStatus: status }),
}))
