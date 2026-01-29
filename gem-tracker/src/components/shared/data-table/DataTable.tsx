import * as React from "react"
import { Fragment } from "react"
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  type SortingState,
  type PaginationState,
  type ExpandedState,
  type Row,
  type ColumnDef,
} from "@tanstack/react-table"
import { Database } from "lucide-react"
import { cn } from "@/lib/utils"
import { tableColumnStylesWithIndex } from "./helpers"
import { PaginationFooter } from "./PaginationFooter"

// Extend Tanstack's ColumnDef to include the className property requested by the user
export type TableColumnDef<TData, TValue = any> = ColumnDef<TData, TValue> & {
  className?: string
}

interface IDataTableProps<TData extends object> {
  data: TData[]
  columns: TableColumnDef<TData, any>[]
  sorting?: SortingState

  pagination: PaginationState
  expanded?: ExpandedState
  onPaginationChange: (
    updater: PaginationState | ((state: PaginationState) => PaginationState),
  ) => void
  onExpandedChange?: (updater: ExpandedState | ((state: ExpandedState) => ExpandedState)) => void
  onSortingChange?: (updater: SortingState | ((state: SortingState) => SortingState)) => void
  totalRecords: number
  onRowClick?: (data: TData) => void
  renderSubComponent?: (row: Row<TData>) => React.ReactElement
  emptyState?: React.ReactNode
}

export default function DataTable<TData extends object>({
  data,
  columns,
  sorting,
  pagination,
  expanded = {},
  onPaginationChange,
  onExpandedChange = () => {},
  onSortingChange,
  totalRecords,
  onRowClick,
  renderSubComponent,
  emptyState,
}: IDataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    state: {
      ...(sorting ? { sorting } : {}),
      pagination,
      expanded,
    },
    onPaginationChange,
    onExpandedChange,
    ...(onSortingChange ? { onSortingChange } : {}),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => !!renderSubComponent,
    manualPagination: true,
    debugTable: true,
  })

  const headerGroups = table.getHeaderGroups()
  const rows = table.getRowModel().rows

  const { tableRowStylesWithIndex } = tableColumnStylesWithIndex(rows.length)

  return (
    <div className='rounded-xl border border-slate-200 overflow-hidden h-full bg-white flex flex-col justify-between shadow-sm'>
      <div className='overflow-y-auto grow'>
        <table className='min-w-full border-collapse'>
          <thead className='sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm border-b border-slate-200'>
            {headerGroups.map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-6 py-4 text-left text-sm font-black text-slate-600",
                      (header.column.columnDef as TableColumnDef<TData>).className,
                    )}
                  >
                    {header.isPlaceholder ? null : (
                      <div className='flex items-center'>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {rows.length ? (
              rows.map((row, i) => (
                <Fragment key={row.id}>
                  <tr
                    className={cn(
                      tableRowStylesWithIndex(i),
                      "hover:bg-slate-50 transition-colors cursor-pointer group",
                    )}
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest('[data-expander="true"]')) return
                      if (row.getCanExpand()) {
                        row.toggleExpanded()
                      }
                      onRowClick?.(row.original)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-6 py-4",
                          (cell.column.columnDef as TableColumnDef<TData>).className,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {row.getIsExpanded() && renderSubComponent && (
                    <tr key={`${row.id}-expanded`} className='bg-slate-50/50'>
                      <td colSpan={row.getVisibleCells().length} className='px-6 py-4'>
                        {renderSubComponent(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className='py-20 text-center'>
                  {emptyState ? (
                    emptyState
                  ) : (
                    <div className='flex flex-col items-center justify-center gap-3'>
                      <div className='w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200'>
                        <Database size={32} />
                      </div>
                      <div className='flex flex-col items-center gap-1'>
                        <p className='text-slate-400 text-sm font-medium'>No Data Found.</p>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationFooter
        pagination={pagination}
        totalRecords={totalRecords}
        onPaginationChange={onPaginationChange}
      />
    </div>
  )
}
