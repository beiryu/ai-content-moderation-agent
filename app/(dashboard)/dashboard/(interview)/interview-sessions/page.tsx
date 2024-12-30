import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"

export default function InterviewSessionsPage() {
  return (
    <DashboardShell className="m-2 overscroll-none">
      <DashboardHeader heading="Interview Sessions"></DashboardHeader>
    </DashboardShell>
  )
}
