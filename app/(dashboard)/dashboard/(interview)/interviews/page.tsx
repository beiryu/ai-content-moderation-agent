"use client"

import { useGetInterviews } from "@/hooks/api/useGetInterviews"
import { columns } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"
import { DashboardHeader } from "@/components/header"
import { CreateInterviewDialog } from "@/components/modals/create-interview-dialog"
import { DashboardShell } from "@/components/shell"

export default function LiveInterviewPage() {
  const { data: interviews } = useGetInterviews()

  if (!interviews) return null

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Live Interview"
        text="Live Interview offers a variety of interview scenarios and provides customized add-ons tailored to different industries."
      >
        <CreateInterviewDialog />
      </DashboardHeader>
      <DataTable data={interviews} columns={columns} />
    </DashboardShell>
  )
}
