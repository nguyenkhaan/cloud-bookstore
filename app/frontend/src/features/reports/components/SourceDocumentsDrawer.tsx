import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { Badge } from '@/components/common'
import { useRevenueExpenseDocumentsQuery } from '../reports.hook'
import { formatVnDateTimeShort, formatVnd, toNumber } from '../reports.presentation'
import type { PaymentMethodFilter, RevenueExpenseSourceRow } from '../reports.type'

export interface SourceDocumentsDrawerProps {
  source: RevenueExpenseSourceRow | null
  fromDate: string
  toDate: string
  method?: PaymentMethodFilter | ''
  onClose: () => void
}

export const SourceDocumentsDrawer: React.FC<SourceDocumentsDrawerProps> = ({
  source,
  fromDate,
  toDate,
  method,
  onClose,
}) => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setSearch('')
    setPage(1)
  }, [source?.sourceKey, fromDate, toDate, method])

  useEffect(() => {
    if (!source) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [source, onClose])

  const docsQuery = useRevenueExpenseDocumentsQuery(
    {
      from: fromDate,
      to: toDate,
      source: source?.sourceKey ?? '',
      method,
      search: search.trim() || undefined,
      page,
      pageSize: 10,
    },
    Boolean(source),
  )

  if (!source) return null

  const items = docsQuery.data?.items ?? []
  const totalCount = toNumber(docsQuery.data?.totalCount)
  const totalPages = Math.max(1, toNumber(docsQuery.data?.totalPages) || 1)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {source.sourceLabel} · <span className="font-mono text-sm">{source.codePattern}</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {source.quantityLabel} · {source.paymentChannelLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng ngăn kéo chi tiết chứng từ"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-100 px-6 py-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Tìm mã chứng từ hoặc đối tượng..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-3 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {docsQuery.isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : docsQuery.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
              {docsQuery.error instanceof Error
                ? docsQuery.error.message
                : 'Không thể tải danh sách chứng từ.'}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-500">
              Không có chứng từ nào trong nhóm nguồn này.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="rounded-xl bg-indigo-50/70 text-slate-600">
                    <th className="px-3 py-2.5 font-semibold first:rounded-l-xl">Chứng từ</th>
                    <th className="px-3 py-2.5 font-semibold">Đối tượng</th>
                    <th className="px-3 py-2.5 font-semibold">Số tiền</th>
                    <th className="px-3 py-2.5 font-semibold">Kênh / Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((doc, idx) => (
                    <tr key={`${doc.documentId}-${idx}`} className="hover:bg-slate-50/70">
                      <td className="px-3 py-3 align-top">
                        <div className="font-mono font-semibold text-slate-900">{doc.documentCode}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatVnDateTimeShort(doc.occurredAt)}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top text-slate-700">{doc.counterpartyName}</td>
                      <td className="px-3 py-3 align-top font-semibold text-slate-900">
                        {formatVnd(doc.amount)}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="text-slate-700">{doc.paymentMethodLabel}</div>
                        <Badge variant="success" size="xs" className="mt-1">
                          {doc.statusLabel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 text-xs text-slate-500">
          <span>Tổng: {totalCount} chứng từ</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="Trang trước"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-semibold text-slate-800">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              aria-label="Trang sau"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
