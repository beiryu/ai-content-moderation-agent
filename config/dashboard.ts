import { DashboardConfig } from "types"

export const dashboardConfig: DashboardConfig = {
  mainNav: [
    {
      title: "Documentation",
      href: "/docs",
      disabled: true,
    },
    {
      title: "Support",
      href: "/support",
      disabled: true,
    },
  ],
  sidebarNav: [
    {
      title: "Posts",
      href: "/dashboard",
      icon: "post",
    },
    {
      title: "Live Interview",
      href: "/dashboard/live-interview",
      icon: "page",
    },
    {
      title: "Billing",
      href: "/dashboard/billing",
      icon: "billing",
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: "settings",
    },
  ],
}
