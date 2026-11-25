import { useState } from 'react'
import { Card } from '@/components/common/Card'
import type { HrEmployeeShiftRecord } from '../hr-employees.type'

const PAGE_SIZE = 3

export interface EmployeeRecentShiftsCardProps {
  shifts: HrEmployeeShiftRecord[]
  isLoading?: boolean
}

export function EmployeeRecentShiftsCard({
  shifts,
  isLoading = false,
}: EmployeeRecentShiftsCardProps) {
  const [page, setPage] = useState(1)
  const totalCount = shifts.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const visibleShifts = shifts.slice(startIndex, startIndex + PAGE_SIZE)

  return (
    <Card
      title="Ca trực gần đây"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
              <th className="py-2.5 pr-4">Ngày làm</th>
              <th className="py-2.5 px-4">Thứ tự ca</th>
              <th className="py-2.5 px-4">Thời gian</th>
              <th className="py-2.5 px-4">Check-in / Check-out</th>
              <th className="py-2.5 pl-4">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td className="py-8 text-center text-xs text-slate-500" colSpan={5}>
                  Đang tải ca trực gần đây...
                </td>
              </tr>
            ) : visibleShifts.length === 0 ? (
              <tr>
                <td className="py-8 text-center text-xs text-slate-500" colSpan={5}>
                  Chưa có bản ghi ca trực gần đây.
                </td>
              </tr>
            ) : (
              visibleShifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 pr-4 font-semibold text-slate-900">
                    {shift.workDate}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {shift.shiftOrder}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {shift.timeRange}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {shift.checkInOut}
                  </td>
                  <td
                    className={
                      shift.status === 'missing_attendance'
                        ? 'py-3.5 pl-4 font-medium text-[#b85214]'
                        : 'py-3.5 pl-4 text-slate-700'
                    }
                  >
                    {shift.status === 'missing_attendance'
                      ? 'Thiếu chấm công'
                      : 'Đã hoàn thành'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <span>
            Hiển thị {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, totalCount)} trong {totalCount} ca
          </span>
          <div className="flex items-center gap-1">
            <button
              aria-label="Trang trước"
              className="inline-flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg px-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              type="button"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (pageNumber) => (
                <button
                  key={pageNumber}
                  aria-current={safePage === pageNumber ? 'page' : undefined}
                  className={`inline-flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-semibold ${
                    safePage === pageNumber
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setPage(pageNumber)}
                  type="button"
                >
                  {pageNumber}
                </button>
              ),
            )}
            <button
              aria-label="Trang sau"
              className="inline-flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg px-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={safePage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              type="button"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
