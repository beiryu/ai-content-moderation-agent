import { useEffect, useRef } from "react"

interface VideoPreviewProps {
  stream: MediaStream | null
}

export function VideoPreview({ stream }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let animationFrameId: number

    const drawVideoToCanvas = () => {
      if (videoRef.current && canvasRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight

        const ctx = canvasRef.current.getContext("2d")
        if (ctx) {
          ctx.drawImage(
            videoRef.current,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          )
        }
      }
      animationFrameId = requestAnimationFrame(drawVideoToCanvas)
    }

    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play()
        animationFrameId = requestAnimationFrame(drawVideoToCanvas)
      }
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      if (videoRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        videoRef.current.srcObject = null
      }
    }
  }, [stream])

  return (
    <div className="w-full flex justify-center">
      {/* Muted video element */}
      <video ref={videoRef} style={{ display: "none" }} muted />
      <canvas
        ref={canvasRef}
        className="rounded border border-border"
        style={{ maxWidth: "100%", height: "auto" }}
      />
    </div>
  )
}
