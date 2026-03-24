import { useCallback, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { Document } from "@/lib/validations/document"

const getDocuments = async (): Promise<Document[]> => {
  const response = await fetch("/api/documents")
  const data = await response.json()
  return data || []
}

export function useGetDocuments() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const { data, isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  })

  const filteredDocuments = useMemo(() => {
    if (!data) return []

    return data.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = typeFilter === "all" || doc.type === typeFilter

      return matchesSearch && matchesType
    })
  }, [data, searchQuery, typeFilter])

  const getDocumentStats = useCallback(() => {
    const documents = data || []
    const total = documents.length
    const byType = documents.reduce((acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { total, byType }
  }, [data])

  return {
    documents: data || [],
    filteredDocuments: filteredDocuments,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    getDocumentStats,
  }
}
