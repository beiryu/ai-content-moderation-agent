import { cookies } from "next/headers"
import { accounts, mails } from "@/mocks/data"

import History from "@/components/history"
import { LiveInterviewPlayground } from "@/components/live-interview-playground"
import { Mail } from "@/components/mail"

export default function LiveInterviewDetailPage() {
  const layout = cookies().get("react-resizable-panels:layout:mail")
  const collapsed = cookies().get("react-resizable-panels:collapsed")

  const defaultLayout = layout ? JSON.parse(layout.value) : undefined
  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined

  return (
    <div className="flex flex-col gap-12">
      <LiveInterviewPlayground />
      <History />
      <Mail
        accounts={accounts}
        mails={mails}
        defaultLayout={defaultLayout}
        defaultCollapsed={defaultCollapsed}
        navCollapsedSize={4}
      />
    </div>
  )
}
