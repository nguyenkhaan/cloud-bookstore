import React from 'react'
import { ChevronLeft, ChevronRight, History } from 'lucide-react'
import {
  formatShortDevice,
  formatVnTimestampParts,
  isBookCopyEntity,
  moduleDisplayLabel,
  roleDisplayLabel,
  summarizeTransition,
} from '../audit.presentation'
import type { AuditLogItem } from '../audit.type'

export interface AuditTableProps {
  items: AuditLogItem[]
  selectedId: string | null
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  isLoading: boolean
  onSelectLog: (id: string) => void
  onPageChange: (nextPage: number) => void
  onOpenCopyLifecycle: (copyId: string) => void
}

export const AuditTable: React.FC<AuditTableProps> = ({
  items,
  selectedId,
  totalCount,
  page,
  pageSize,
  totalPages,
  isLoading,
  onSelectLog,
  onPageChange,
  onOpenCopyLifecycle,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
        Không tìm thấy bản ghi nhật ký nào phù hợp với bộ lọc hiện tại.
      </div>
    )
  }

  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalCount)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-220 w-full text-left text-xs">
          <thead>
            <tr className="rounded-xl bg-indigo-50/70 text-slate-600">
              <th className="px-4 py-3 font-semibold first:rounded-l-xl">Timestamp</th>
              <th className="px-4 py-3 font-semibold">Tài khoản / Vai trò</th>
              <th className="px-4 py-3 font-semibold">IP / Thiết bị</th>
              <th className="px-4 py-3 font-semibold">Phân hệ / Hành động</th>
              <th className="px-4 py-3 font-semibold">Trước → Sau</th>
              <th className="px-4 py-3 font-semibold last:rounded-r-xl">Lý do nghiệp vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const ts = formatVnTimestampParts(item.occurredAt)
              const transition = summarizeTransition(item)
              const isSelected = item.id === selectedId
              const isCopy = isBookCopyEntity(item.entityType)

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectLog(item.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-4 py-3.5 align-top whitespace-nowrap">
                    <div className="font-bold text-slate-900">{ts.date}</div>
                    <div className="font-mono text-[11px] font-semibold text-slate-700">{ts.timeMs}</div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="font-medium text-slate-900">
                      {item.actorName || 'Hệ thống'}
                    </div>
                    <div className="text-[11px] text-slate-500">{roleDisplayLabel(item.actorRole)}</div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="font-mono text-slate-800">{item.ipAddress || '127.0.0.1'}</div>
                    <div className="text-[11px] text-slate-500">{formatShortDevice(item.userAgent)}</div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="font-medium text-slate-900">{moduleDisplayLabel(item.entityType)}</div>
                    <div className="font-mono text-[11px] text-slate-600">{item.action}</div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900">
                      <span>{transition.target}</span>
                      {isCopy && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenCopyLifecycle(item.entityId)
                          }}
                          title="Mở lịch sử vòng đời bản sách 360°"
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                        >
                          <History className="h-3 w-3" />
                          360°
                        </button>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-600">{transition.diff}</div>
                  </td>
                  <td className="px-4 py-3.5 align-top text-slate-700 max-w-xs">
                    {item.reason || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>
          Hiển thị {startItem}–{endItem} trong {totalCount} sự kiện
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Trang trước"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 font-semibold text-slate-800">
            {page} / {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Trang sau"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
