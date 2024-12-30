"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Row } from "@tanstack/react-table"
import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { InterviewSchema } from "@/lib/validations/interview"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type_options } from "@/components/filters"
import DeleteDialog from "@/components/modals/delete-modal"
import EditDialog from "@/components/modals/edit-modal"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [dialogContent, setDialogContent] =
    React.useState<React.ReactNode | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState<boolean>(false)

  const interview = InterviewSchema.parse(row.original)

  const router = useRouter()

  const handleEditClick = () => {
    setDialogContent(<EditDialog interview={interview} />)
  }

  return (
    <Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex size-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(interview.id)}
          >
            <Copy className="mr-2 size-4" />
            Copy Interview ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DialogTrigger
            asChild
            onClick={() => {
              router.push(`/dashboard/interviews/${interview.id}`)
            }}
          >
            <DropdownMenuItem>
              {" "}
              <Eye className="mr-2 size-4" />
              View Details
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogTrigger asChild onClick={handleEditClick}>
            <DropdownMenuItem>
              <Pencil className="mr-2 size-4" />
              Edit Details
            </DropdownMenuItem>
          </DialogTrigger>
          {/* <DropdownMenuItem
            onSelect={() => setShowDeleteDialog(true)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 size-4" />
            Delete Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Labels</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={interview.type}>
                {type_options.map((type) => (
                  <DropdownMenuRadioItem key={type.value} value={type.value}>
                    <type.icon className="size-4 mr-2" />
                    {type.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub> */}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogContent && <DialogContent>{dialogContent}</DialogContent>}
      {/* <DeleteDialog
        interview={interview}
        isOpen={showDeleteDialog}
        showActionToggle={setShowDeleteDialog}
      /> */}
    </Dialog>
  )
}
