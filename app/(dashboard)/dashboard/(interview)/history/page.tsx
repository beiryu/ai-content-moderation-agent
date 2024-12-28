import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"

export default function HistoryPage() {
  return (
    <DashboardShell className="m-2 overscroll-none">
      <DashboardHeader heading="History"></DashboardHeader>
    </DashboardShell>
  )
}
