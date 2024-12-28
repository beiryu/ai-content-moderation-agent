import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"

export default function MockInterviewPage() {
  return (
    <DashboardShell className="m-2 overscroll-none">
      <DashboardHeader heading="Mock Interview"></DashboardHeader>
    </DashboardShell>
  )
}
