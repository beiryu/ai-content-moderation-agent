import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"

export default function DashboardLoading() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Dashboard" text="Loading your dashboard...">
        <Skeleton className="h-10 w-28" />
      </DashboardHeader>

      {/* Feature cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array(3)
          .fill(null)
          .map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="size-5 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-9 w-full" />
            </Card>
          ))}
      </div>

      {/* Getting Started skeleton */}
      <div className="mt-8">
        <Skeleton className="h-7 w-36 mb-4" />
        <div className="bg-muted rounded-lg p-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-3/6" />
          </div>
        </div>
      </div>

      {/* Bottom cards skeleton */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {Array(2)
          .fill(null)
          .map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="size-5 rounded-full" />
              </div>
              <div className="py-8 flex justify-center">
                <Skeleton className="h-5 w-48" />
              </div>
              <Skeleton className="h-9 w-full" />
            </Card>
          ))}
      </div>
    </DashboardShell>
  )
}
