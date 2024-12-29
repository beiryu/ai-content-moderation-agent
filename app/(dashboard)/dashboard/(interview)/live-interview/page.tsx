"use client"

import { useTasks } from "@/hooks/api/useTasks"
import { columns } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"

export default function LiveInterviewPage() {
  const { data: tasks } = useTasks()

  return <DataTable data={tasks} columns={columns} />
}
