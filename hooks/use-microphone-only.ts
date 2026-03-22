import { useCallback, useState } from "react"
import { useInterviewSessionStore } from "@/stores/interview-session.store"

interface UseMicrophoneReturn {
  micOpen: boolean
  microphone: MediaRecorder | null
  userMedia: MediaStream | null
  toggleMicrophone: () => Promise<void>
}

export function useMicrophoneOnly(
  onDataAvailable: (data: BlobEvent) => void
): UseMicrophoneReturn {
  const [micOpen, setMicOpen] = useState(false)
  const [microphone, setMicrophone] = useState<MediaRecorder | null>(null)
  const [userMedia, setUserMedia] = useState<MediaStream | null>(null)

  const { setMicrophoneStatus } = useInterviewSessionStore()

  const toggleMicrophone = useCallback(async () => {
    if (microphone && userMedia) {
      microphone.stop()
      userMedia.getTracks().forEach((t) => t.stop())
      setMicrophone(null)
      setUserMedia(null)
      setMicrophoneStatus("disconnected")
      return
    }

    try {
      setMicrophoneStatus("connecting")

      const media = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mic = new MediaRecorder(media)
      mic.start(500)

      mic.onstart = () => {
        setMicOpen(true)
        setMicrophoneStatus("connected")
      }

      mic.onstop = () => {
        setMicOpen(false)
        setMicrophoneStatus("disconnected")
      }

      mic.ondataavailable = onDataAvailable

      setUserMedia(media)
      setMicrophone(mic)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      setMicrophoneStatus("disconnected")
    }
  }, [microphone, userMedia, onDataAvailable, setMicrophoneStatus])

  return {
    micOpen,
    microphone,
    userMedia,
    toggleMicrophone,
  }
}
