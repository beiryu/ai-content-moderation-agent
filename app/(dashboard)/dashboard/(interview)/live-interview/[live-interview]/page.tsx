import History from "@/components/history"
import { LiveInterviewPlayground } from "@/components/live-interview-playground"

export default function LiveInterviewDetailPage() {
  return (
    <div className="flex flex-col gap-12">
      <LiveInterviewPlayground />
      <History />
    </div>
  )
}
