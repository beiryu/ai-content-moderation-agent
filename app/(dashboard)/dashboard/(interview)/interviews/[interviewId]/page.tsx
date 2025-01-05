import { cookies } from "next/headers"

import History from "@/components/history"
import { LiveInterviewPlayground } from "@/components/live-interview-playground"
import { LiveInterviewPlaygroundV2 } from "@/components/live-interview-playground-v2"

export default function LiveInterviewDetailPage() {
  const layout = cookies().get("react-resizable-panels:layout:mail")
  const collapsed = cookies().get("react-resizable-panels:collapsed")

  const defaultLayout = layout ? JSON.parse(layout.value) : undefined
  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined

  return (
    <div className="flex flex-col gap-12">
      {/* <LiveInterviewPlayground />
      <History /> */}
      <LiveInterviewPlaygroundV2 defaultLayout={defaultLayout} />
    </div>
  )
}
