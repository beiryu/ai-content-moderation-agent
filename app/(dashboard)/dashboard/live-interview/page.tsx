import { DashboardHeader } from "@/components/header"
import History from "@/components/history"
import { LiveInterviewPlayground } from "@/components/live-interview-playground"
import { DashboardShell } from "@/components/shell"

export default function LiveInterviewPage() {
  return (
    <DashboardShell className="m-2 overscroll-none">
      <DashboardHeader heading="Live Interview"></DashboardHeader>
      <div className="flex flex-col gap-12">
        <LiveInterviewPlayground />
        <History />
      </div>
    </DashboardShell>
  )
}
