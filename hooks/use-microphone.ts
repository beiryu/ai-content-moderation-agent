import { useCallback, useState } from "react"

interface UseMicrophoneReturn {
  micOpen: boolean
  microphone: MediaRecorder | null
  userMedia: MediaStream | null
  toggleMicrophone: () => Promise<void>
}

export function useMicrophone(
  onDataAvailable: (data: BlobEvent) => void
): UseMicrophoneReturn {
  const [micOpen, setMicOpen] = useState(false)
  const [microphone, setMicrophone] = useState<MediaRecorder | null>(null)
  const [userMedia, setUserMedia] = useState<MediaStream | null>(null)

  const toggleMicrophone = useCallback(async () => {
    if (microphone && userMedia) {
      microphone.stop()
      setMicrophone(null)
      return
    }

    try {
      const media = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true,
      })

      const mic = new MediaRecorder(media)
      mic.start(500)

      mic.onstart = () => setMicOpen(true)
      mic.onstop = () => setMicOpen(false)
      mic.ondataavailable = onDataAvailable

      setUserMedia(media)
      setMicrophone(mic)
    } catch (error) {
      console.error("Error accessing microphone:", error)
    }
  }, [microphone, userMedia, onDataAvailable])

  return {
    micOpen,
    microphone,
    userMedia,
    toggleMicrophone,
  }
}
