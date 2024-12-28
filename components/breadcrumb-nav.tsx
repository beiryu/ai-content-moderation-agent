"use client"

import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const breadcrumbMap = {
  "/dashboard/live-interview": {
    parent: { title: "Interview", href: "/dashboard/live-interview" },
    current: "Live Interview",
  },
  "/dashboard/mock-interview": {
    parent: { title: "Interview", href: "/dashboard/mock-interview" },
    current: "Mock Interview",
  },
  "/dashboard/history": {
    parent: { title: "Interview", href: "/dashboard/history" },
    current: "History",
  },
}

export function BreadcrumbNav() {
  const pathname = usePathname()
  const breadcrumb = breadcrumbMap[pathname as keyof typeof breadcrumbMap]

  if (!breadcrumb) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href={breadcrumb.parent.href}>
            {breadcrumb.parent.title}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>{breadcrumb.current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
