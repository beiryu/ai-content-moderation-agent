import { create } from "zustand"

interface InterviewMessage {
  id: string
  timestamp: Date
  text: string
}

interface LiveInterviewStore {
  microphoneStatus: "disconnected" | "connecting" | "connected"
  transcriptionBuffer: string
  interimText: string
  lastSpeakTime: number
  messages: InterviewMessage[]

  setMicrophoneStatus: (
    status: "disconnected" | "connecting" | "connected"
  ) => void
  processTranscript: (transcript: string, isFinal: boolean) => void
}

export const useLiveInterviewStore = create<LiveInterviewStore>()(
  (set, get) => ({
    microphoneStatus: "disconnected",
    transcriptionBuffer: "",
    interimText: "",
    lastSpeakTime: Date.now(),
    messages: [],

    setMicrophoneStatus: (status) => set({ microphoneStatus: status }),
    processTranscript: (transcript: string, isFinal: boolean) => {
      const now = Date.now()
      const SILENCE_THRESHOLD = 2000 // 2 seconds of silence
      const state = get()
      const timeSinceLastSpeak = now - state.lastSpeakTime

      // Check silence threshold first
      if (
        timeSinceLastSpeak > SILENCE_THRESHOLD &&
        state.transcriptionBuffer.trim()
      ) {
        // Create new message from existing buffer
        set({
          messages: [
            ...state.messages,
            {
              id: Date.now().toString(),
              timestamp: new Date(),
              text: state.transcriptionBuffer.trim(),
            },
          ],
          transcriptionBuffer: isFinal ? transcript : "", // Start new buffer if final
          interimText: isFinal ? "" : transcript, // Update interim if not final
          lastSpeakTime: now,
        })
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
  })
)
