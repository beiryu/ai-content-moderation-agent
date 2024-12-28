import { create } from "zustand"

interface LiveInterviewStore {
  transcribedText: string
  interimText: string

  addTranscribedText: (transcribedText: string) => void
  clearTranscribedText: () => void
  setTranscribedText: (transcribedText: string) => void
  setInterimText: (interimText: string) => void
}

export const useLiveInterviewStore = create<LiveInterviewStore>()((set) => ({
  transcribedText: "",
  interimText: "",

  addTranscribedText: (transcribedText) =>
    set((state) => ({
      transcribedText:
        state.transcribedText === ""
          ? transcribedText.slice(1)
          : state.transcribedText + transcribedText,
    })),
  clearTranscribedText: () => set({ transcribedText: "" }),
  setInterimText: (interimText) => set({ interimText }),
  setTranscribedText: (transcribedText) => set({ transcribedText }),
}))
