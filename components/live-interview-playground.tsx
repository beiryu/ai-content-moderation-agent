// TODO: Remove this file

"use client"

import { useCallback, useEffect, useState } from "react"
// import { useChatHistoryStore } from "@/stores/chat-history.store"
import { useInterviewSessionStore } from "@/stores/interview-session.store"
import { Flags } from "@/types"
import { useCompletion } from "ai/react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import RecorderTranscriber from "./recorder-transcriber"

export function LiveInterviewPlayground() {
  const [flag, setFlag] = useState<Flags>("interview-assistant")
  const [backgroundText, setBackgroundText] = useState<string>("")

  // const { addChatHistory } = useChatHistoryStore()

  const {
    interimText,
    // transcribedText,
    // clearTranscribedText,
    // setTranscribedText,
  } = useInterviewSessionStore()

  const { completion, stop, isLoading, error, setInput, handleSubmit } =
    useCompletion({
      api: "/api/assistant/completion",
      body: {
        backgroundText,
        flag,
      },
    })

  const handleFlag = useCallback(
    (checked: boolean) => {
      setFlag(checked ? "interview-assistant" : "summarize")
    },
    [setFlag]
  )

  const clearTranscriptionChange = () => {
    setInput("")
    // clearTranscribedText()
  }

  const saveChatHistory = () => {
    // addChatHistory({
    //   createdAt: new Date().toISOString(),
    //   data: completion,
    //   tag: flag === "interview-assistant" ? "interview-assistant" : "summarize",
    // })
  }

  // useEffect(() => {
  //   setInput(transcribedText)
  // }, [transcribedText, setInput])

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="fixed top-0 left-0 w-full p-4 text-center text-xs bg-red-500 text-white">
          {error.message}
        </div>
      )}
      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-4">
          <Label htmlFor="system_prompt" className="text-2xl font-semibold">
            Interview Background
          </Label>
          <Textarea
            id="system_prompt"
            placeholder="Type or paste your text here."
            className="overflow-hidden"
            value={backgroundText}
            onChange={(e) => setBackgroundText(e.target.value)}
          />
          <RecorderTranscriber />
        </div>

        <div className="flex flex-col gap-4">
          <Label
            htmlFor="transcription"
            className="flex justify-between items-center text-2xl font-semibold"
          >
            Transcription
            <Button
              size="sm"
              variant="destructive"
              className="text-xs"
              onClick={clearTranscriptionChange}
            >
              Clear
            </Button>
          </Label>
          <Textarea
            id="transcription"
            className="overflow-hidden"
            placeholder="Your transcribed text will appear here."
            // value={transcribedText + interimText}
            onChange={(e) => {
              // setTranscribedText(e.target.value)
            }}
          />
        </div>
      </div>
      <div>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-2">
          <div className="flex items-center justify-center w-full border rounded-md">
            <Label className="transition-opacity duration-300">
              Summarizer
            </Label>
            <Switch
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted m-2"
              onCheckedChange={handleFlag}
              defaultChecked
              checked={flag === "interview-assistant"}
            />
            <Label className="transition-opacity duration-300">
              Interview Assistant
            </Label>
          </div>

          {!isLoading ? (
            <Button
              effect="gooeyRight"
              variant="default"
              disabled={isLoading}
              type="submit"
            >
              Process
            </Button>
          ) : (
            <Button
              effect="gooeyRight"
              variant="default"
              disabled={!isLoading}
              onClick={stop}
            >
              Stop
            </Button>
          )}
        </form>
      </div>

      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex whitespace-pre-wrap">{completion}</div>
        {completion && (
          <Button
            variant="secondary"
            className="text-xs"
            onClick={saveChatHistory}
          >
            Save
          </Button>
        )}
      </div>
    </div>
  )
}
