import { HistoryData } from "@/types"
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ChatHistoryState {
  chatHistory: HistoryData[]
  setChatHistory: (chatHistory: HistoryData[]) => void
  addChatHistory: (chatHistory: HistoryData) => void
  deleteChatHistory: (createdAt: string) => void
  clearChatHistory: () => void
}

export const useChatHistoryStore = create<ChatHistoryState>()(
  persist(
    (set) => ({
      chatHistory: [],
      setChatHistory: (chatHistory) => set({ chatHistory }),
      addChatHistory: (chatHistory) =>
        set((state) => ({
          chatHistory: [chatHistory, ...state.chatHistory],
        })),
      deleteChatHistory: (createdAt) =>
        set((state) => ({
          chatHistory: state.chatHistory.filter(
            (item) => item.createdAt !== createdAt
          ),
        })),
      clearChatHistory: () => set({ chatHistory: [] }),
    }),
    {
      name: "chat-history",
      skipHydration: true,
    }
  )
)
