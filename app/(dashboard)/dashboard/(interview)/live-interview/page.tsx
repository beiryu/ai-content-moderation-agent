import { z } from "zod"

import { taskSchema } from "@/lib/validations/table"
import { columns } from "@/components/data-table/columns"
import { DataTable } from "@/components/data-table/data-table"

async function getTasks() {
  const res = await fetch("https://my.api.mockaroo.com/tasks.json?key=f0933e60")
  if (!res.ok) {
    throw new Error("Failed to fetch data")
  }
  const data = await res.json()

  // ** Workaround as my mock api has date returned as "dd-Mon-yyyy"
  const tasks = z.array(taskSchema).parse(
    data.map((task: any) => {
      task.due_date = new Date(Date.parse(task.due_date))
      return task
    })
  )
  return tasks
}

export default async function LiveInterviewPage() {
  const tasks = await getTasks()

  return <DataTable data={tasks} columns={columns} />
}
