import { create } from "zustand"

interface DocumentSelectionState {
  // State
  selectedDocuments: string[]

  // Actions
  selectDocument: (documentId: string) => void
  deselectDocument: (documentId: string) => void
  toggleDocument: (documentId: string) => void
  clearSelection: () => void
}

export const useDocumentSelectionStore = create<DocumentSelectionState>()(
  (set) => ({
    // Initial state
    selectedDocuments: [],

    // Actions
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

    clearSelection: () => set({ selectedDocuments: [] }),
  })
)
