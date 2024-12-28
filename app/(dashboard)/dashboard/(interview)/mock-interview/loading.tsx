import { CardSkeleton } from "@/components/card-skeleton"
import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"

export default function MockInterviewLoading() {
  return (
    <DashboardShell className="m-2 overscroll-none">
      <DashboardHeader heading="Mock Interview"></DashboardHeader>
      <div className="flex flex-col gap-12">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </DashboardShell>
  )
}
