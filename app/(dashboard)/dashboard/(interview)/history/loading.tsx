import { CardSkeleton } from "@/components/card-skeleton"
import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"

export default function HistoryLoading() {
  return (
    <DashboardShell className="m-2 overscroll-none">
      <DashboardHeader heading="History"></DashboardHeader>
      <div className="flex flex-col gap-12">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </DashboardShell>
  )
}
