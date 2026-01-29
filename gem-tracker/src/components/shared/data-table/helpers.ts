import type { PaginationState } from "@tanstack/react-table"

export const tableColumnStylesWithIndex = (_rowsLength: number) => {
    function tableRowStylesWithIndex(_index: number) {
        return "border-b"
    }

    return {
        tableRowStylesWithIndex,
    }
}

export default function calculatePaginationPages(
    pagination: PaginationState,
    totalRecords: number
) {
    const totalPages = Math.ceil(totalRecords / (pagination.pageSize ?? 10))

    const currentPage = (pagination.pageIndex ?? 0) + 1 // Tanstack is 0-indexed
    const siblingCount = 1
    const pageNumbers: (string | number)[] = [1]

    const startPage = Math.max(2, currentPage - siblingCount)
    const endPage = Math.min(totalPages - 1, currentPage + siblingCount)

    if (startPage > 2) pageNumbers.push("start-ellipsis")

    for (let i = startPage; i <= endPage; i++) pageNumbers.push(i)

    if (endPage < totalPages - 1) pageNumbers.push("end-ellipsis")

    if (totalPages > 1) {
        pageNumbers.push(totalPages)
    }

    return pageNumbers
}
