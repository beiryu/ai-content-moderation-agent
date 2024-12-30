import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bug,
  CheckCircle2,
  Circle,
  FlaskConical,
  HelpCircle,
  PackagePlus,
  Radio,
  ScrollText,
  Timer,
  XCircle,
} from "lucide-react"

export const status_options = [
  // {
  //   value: "backlog",
  //   label: "Backlog",
  //   icon: HelpCircle,
  // },
  {
    value: "pending",
    label: "Pending",
    icon: Circle,
  },
  {
    value: "in-progress",
    label: "In Progress",
    icon: Timer,
  },
  {
    value: "done",
    label: "Done",
    icon: CheckCircle2,
  },
  // {
  //   value: "canceled",
  //   label: "Canceled",
  //   icon: XCircle,
  // },
]

export const type_options = [
  {
    value: "mock",
    label: "Mock",
    icon: FlaskConical,
  },
  {
    value: "live",
    label: "Live",
    icon: Radio,
  },
]

export const priority_options = [
  {
    value: "low",
    label: "Low",
    icon: ArrowDown,
  },
  {
    value: "medium",
    label: "Medium",
    icon: ArrowRight,
  },
  {
    value: "high",
    label: "High",
    icon: ArrowUp,
  },
]
