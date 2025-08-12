import { create } from "zustand"

interface ChatDocumentStore {
  // Document Selection State
  selectedDocuments: string[]

  // Session Management State
  activeSessionId: string | undefined

  // Document Selection Actions
  selectDocument: (documentId: string) => void
  deselectDocument: (documentId: string) => void
  toggleDocument: (documentId: string) => void
  clearDocumentSelection: () => void

  // Session Management Actions
  setActiveSession: (sessionId: string) => void
  clearActiveSession: () => void
}

export const useChatDocumentStore = create<ChatDocumentStore>()((set) => ({
  // Initial state
  selectedDocuments: [],
  activeSessionId: undefined,

  // Document Selection Actions
  selectDocument: (documentId: string) =>
    set((state) => ({
      selectedDocuments: state.selectedDocuments.includes(documentId)
        ? state.selectedDocuments
        : [...state.selectedDocuments, documentId],
    })),

  deselectDocument: (documentId: string) =>
    set((state) => ({
      selectedDocuments: state.selectedDocuments.filter(
        (id) => id !== documentId
      ),
    })),

  toggleDocument: (documentId: string) =>
    set((state) => ({
      selectedDocuments: state.selectedDocuments.includes(documentId)
        ? state.selectedDocuments.filter((id) => id !== documentId)
        : [...state.selectedDocuments, documentId],
    })),

  clearDocumentSelection: () => set({ selectedDocuments: [] }),

  // Session Management Actions
  setActiveSession: (sessionId: string) => set({ activeSessionId: sessionId }),

  clearActiveSession: () => set({ activeSessionId: undefined }),
}))
