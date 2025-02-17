"use client"

import { useEffect } from "react"

// import { useChatHistoryStore } from "@/stores/chat-history.store"

import { Card } from "@/components/ui/card"

import { Button } from "./ui/button"

export default function History() {
  // const { chatHistory, deleteChatHistory } = useChatHistoryStore()

  // useEffect(() => {
  //   useChatHistoryStore.persist.rehydrate()
  // }, [])

  return (
    <div className="flex flex-col w-full gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">History</h2>
      </div>
      <main className="overflow-auto space-y-4">
        {/* {chatHistory?.map((data, index) => (
          <Card key={index} className="p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              {data.tag} • {data.createdAt}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  deleteChatHistory(data.createdAt)
                }}
              >
                Delete
              </Button>
            </div>
            <div className="text-sm">{data.data}</div>
          </Card>
        ))} */}
      </main>
    </div>
  )
}
