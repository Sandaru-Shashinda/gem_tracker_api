import { useMemo } from "react"
import { createColumnHelper, type PaginationState } from "@tanstack/react-table"
import { Edit2, Trash2, Mail, CreditCard, Calendar, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { User } from "@/lib/types"
import DataTable from "@/components/shared/data-table/DataTable"

interface UserTableProps {
  data: User[]
  onEdit: (user: User) => void
  onDelete: (id: string) => void
  pagination: PaginationState
  onPaginationChange: (
    updater: PaginationState | ((state: PaginationState) => PaginationState),
  ) => void
}

const columnHelper = createColumnHelper<User>()

export function UserTable({
  data,
  onEdit,
  onDelete,
  pagination,
  onPaginationChange,
}: UserTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "User Identity",
        cell: (info) => {
          const user = info.row.original
          return (
            <div className='flex items-center gap-4'>
              <div className='w-10 h-10 rounded-xl bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-500 shadow-inner'>
                {user.avatar}
              </div>
              <div>
                <p className='font-bold text-slate-800 leading-tight'>{user.name}</p>
                <p className='text-[10px] text-slate-400 font-mono'>{user.email}</p>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor("email", {
        header: "Extended Profile",
        cell: (info) => {
          const user = info.row.original
          return (
            <div className='space-y-1.5'>
              <div className='flex items-center gap-2 text-sm text-slate-500'>
                <CreditCard size={12} className='text-slate-300' />
                <span className='font-bold uppercase tracking-tight'>ID:</span>
                <span className='font-medium'>{user.idNumber || "N/A"}</span>
              </div>
              <div className='flex items-center gap-2 text-sm text-slate-500'>
                <Calendar size={12} className='text-slate-300' />
                <span className='font-bold uppercase tracking-tight'>DOB:</span>
                <span className='font-medium'>
                  {user.dob ? new Date(user.dob).toLocaleDateString() : "N/A"}{" "}
                  {user.age ? `(${user.age}y)` : ""}
                </span>
              </div>
              <div className='flex items-center gap-2 text-sm text-slate-500'>
                <MapPin size={12} className='text-slate-300' />
                <span className='font-medium line-clamp-1'>
                  {user.address || "No address provided"}
                </span>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor("role", {
        header: "Role",
        cell: (info) => {
          const role = info.getValue()
          return (
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black ${
                role === "ADMIN"
                  ? "bg-purple-50 text-purple-600 border border-purple-100"
                  : "bg-blue-50 text-blue-600 border border-blue-100"
              }`}
            >
              {role}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const user = info.row.original
          return (
            <div className='flex items-center justify-end gap-1'>
              <Button
                variant='ghost'
                size='icon'
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(user)
                }}
                className='h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg'
              >
                <Edit2 size={14} />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(user.id)
                }}
                className='h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg'
                disabled={user.id === "u1" || user.role === "ADMIN"}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )
        },
      }),
    ],
    [onEdit, onDelete],
  )

  return (
    <DataTable
      data={data}
      columns={columns}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      totalRecords={data.length}
    />
  )
}
