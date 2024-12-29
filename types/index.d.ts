import { User } from "@prisma/client"
import type { ColumnSort, Row } from "@tanstack/react-table"
import { type SQL } from "drizzle-orm"
import { type z } from "zod"

import { type DataTableConfig } from "@/config/data-table"
import { type filterSchema } from "@/lib/parsers"
import { Icons } from "@/components/icons"

export type NavItem = {
  title: string
  href: string
  disabled?: boolean
}

export type MainNavItem = NavItem

export type SidebarNavItem = {
  title: string
  disabled?: boolean
  external?: boolean
  icon?: keyof typeof Icons
} & (
  | {
      href: string
      items?: never
    }
  | {
      href?: string
      items: NavLink[]
    }
)

export type SiteConfig = {
  name: string
  description: string
  url: string
  ogImage: string
  links: {
    twitter: string
    github: string
    linkedin: string
  }
}

export type DocsConfig = {
  mainNav: MainNavItem[]
  sidebarNav: SidebarNavItem[]
}

export type MarketingConfig = {
  mainNav: MainNavItem[]
}

export type DashboardConfig = {
  mainNav: MainNavItem[]
  sidebarNav: SidebarNavItem[]
}

export type SubscriptionPlan = {
  name: string
  description: string
  stripePriceId: string
}

export type UserSubscriptionPlan = SubscriptionPlan &
  Pick<User, "stripeCustomerId" | "stripeSubscriptionId"> & {
    stripeCurrentPeriodEnd: number
    isPro: boolean
  }

export type Flags = "interview-assistant" | "summarize"

export type HistoryData = {
  createdAt: string
  data: string
  tag: Flags
}

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type StringKeyOf<TData> = Extract<keyof TData, string>

export interface SearchParams {
  [key: string]: string | string[] | undefined
}

export interface Option {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  count?: number
}

export interface ExtendedColumnSort<TData> extends Omit<ColumnSort, "id"> {
  id: StringKeyOf<TData>
}

export type ExtendedSortingState<TData> = ExtendedColumnSort<TData>[]

export type ColumnType = DataTableConfig["columnTypes"][number]

export type FilterOperator = DataTableConfig["globalOperators"][number]

export type JoinOperator = DataTableConfig["joinOperators"][number]["value"]

export interface DataTableFilterField<TData> {
  id: StringKeyOf<TData>
  label: string
  placeholder?: string
  options?: Option[]
}

export interface DataTableAdvancedFilterField<TData>
  extends DataTableFilterField<TData> {
  type: ColumnType
}

export type Filter<TData> = Prettify<
  Omit<z.infer<typeof filterSchema>, "id"> & {
    id: StringKeyOf<TData>
  }
>

export interface DataTableRowAction<TData> {
  row: Row<TData>
  type: "update" | "delete"
}

export interface QueryBuilderOpts {
  where?: SQL
  orderBy?: SQL
  distinct?: boolean
  nullish?: boolean
}
