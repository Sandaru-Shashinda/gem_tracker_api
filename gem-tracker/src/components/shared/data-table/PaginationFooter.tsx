import type { PaginationState } from "@tanstack/react-table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import calculatePaginationPages from "./helpers"
import { TEXT_CONSTANTS } from "@/lib/constants"

interface IPaginationFooter {
  totalRecords: number
  pagination: PaginationState
  onPaginationChange: (
    updater: PaginationState | ((state: PaginationState) => PaginationState),
  ) => void
}

export function PaginationFooter({
  pagination,
  totalRecords,
  onPaginationChange,
}: IPaginationFooter) {
  const pageNumbers = calculatePaginationPages(pagination, totalRecords)

  const { pageIndex, pageSize } = pagination

  const renderPaginationItems = () =>
    pageNumbers.map((i: number | string, index: number) =>
      typeof i === "string" ? (
        <PaginationEllipsis key={`${i}-${index}`} />
      ) : (
        <PaginationItem
          key={i}
          onClick={() => {
            onPaginationChange((state) => ({
              ...state,
              pageIndex: i - 1, // Convert to 0-indexed for Tanstack
            }))
          }}
          className={`
            p-2 rounded-sm h-7 w-7 text-sm flex items-center justify-center border border-solid border-slate-200 cursor-pointer transition-colors
            ${i - 1 === pageIndex ? "bg-blue-100 border-blue-200 text-blue-700 font-bold" : "text-slate-500 hover:bg-slate-50 active:bg-slate-100"}
          `}
        >
          {i}
        </PaginationItem>
      ),
    )

  return (
    <div className='flex items-center justify-between bg-slate-50/50 sticky bottom-0 px-5 py-3 border-t backdrop-blur-sm z-10 rounded-b-lg'>
      <div className='flex items-center space-x-2 font-medium text-xs text-slate-600'>
        <span>{TEXT_CONSTANTS.common.paginationFooter.showing}</span>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => {
            onPaginationChange((state) => ({
              ...state,
              pageSize: Number(value),
              pageIndex: 0,
            }))
          }}
        >
          <SelectTrigger className='h-8 w-[70px] bg-white border-slate-200'>
            <SelectValue>{pageSize.toString()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {["5", "10", "20", "30", "40"].map((i) => (
              <SelectItem key={i} value={i}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className='flex'>
          {TEXT_CONSTANTS.common.paginationFooter.of}&nbsp;
          {totalRecords}&nbsp;
          {TEXT_CONSTANTS.common.paginationFooter.results}
        </span>
      </div>
      <div>
        <Pagination>
          <PaginationContent className='gap-2'>
            <PaginationPrevious
              className='font-medium hover:bg-slate-50 active:bg-slate-100 cursor-pointer h-8 text-xs border-slate-200'
              onClick={() => {
                if (pageIndex > 0) {
                  onPaginationChange((state) => ({
                    ...state,
                    pageIndex: state.pageIndex - 1,
                  }))
                }
              }}
            />
            {renderPaginationItems()}
            <PaginationNext
              className='font-medium hover:bg-slate-50 active:bg-slate-100 cursor-pointer h-8 text-xs border-slate-200'
              onClick={() => {
                const totalPages = Math.ceil(totalRecords / pageSize)
                if (pageIndex < totalPages - 1) {
                  onPaginationChange((state) => ({
                    ...state,
                    pageIndex: state.pageIndex + 1,
                  }))
                }
              }}
            />
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
