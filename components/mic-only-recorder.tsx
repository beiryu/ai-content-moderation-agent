"use client"

import { Mic, MicOff } from "lucide-react"

import { useOpenAITranscription } from "@/hooks/use-openai-transcription"

import { Button } from "./ui/button"

export default function MicOnlyRecorder() {
  const { isListening, startListening, stopListening } =
    useOpenAITranscription("candidate")

  return (
    <Button
      variant={isListening ? "default" : "ghost"}
      size="icon"
      onClick={isListening ? stopListening : startListening}
      title={isListening ? "Stop my microphone" : "Start my microphone"}
    >
      {isListening ? <Mic className="size-4" /> : <MicOff className="size-4" />}
    </Button>
  )
}
