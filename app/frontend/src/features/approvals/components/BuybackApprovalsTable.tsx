import React, { useState } from 'react'
import { Button, SelectBox } from '@/components/common'
import { useBuybackApprovalsQuery } from '../approvals.hook'
import {
  approvalGeneralStatusMeta,
  formatDateTime,
  formatVnd,
} from '../approvals.presentation'
import type { ApprovalQuery, ApprovalStatus } from '../approvals.type'

export interface BuybackApprovalsTableProps {
  onSelectRequest: (id: string) => void
}

export const BuybackApprovalsTable: React.FC<BuybackApprovalsTableProps> = ({ onSelectRequest }) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | ''>('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const query: ApprovalQuery = {
    page,
    pageSize,
    search: search.trim() || undefined,
    status: statusFilter || undefined,
  }

  const { data: pageResult, isLoading } = useBuybackApprovalsQuery(query)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (pageResult?.totalPages ?? 1)) {
      setPage(newPage)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Tìm theo mã phiếu, khách hàng, lý do..."
              type="search"
              value={search}
            />
            <svg className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>

          <div className="w-44">
            <SelectBox
              hideLabel
              label="Lọc theo trạng thái"
              onChange={(val) => {
                setStatusFilter(val as ApprovalStatus | '')
                setPage(1)
              }}
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
                { value: 'APPROVED', label: 'Đã duyệt' },
                { value: 'REJECTED', label: 'Từ chối' },
              ]}
              searchable={false}
              value={statusFilter}
            />
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Tổng cộng: <strong className="text-slate-900">{pageResult?.totalCount ?? 0}</strong> phiếu thu mua
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3 text-left" scope="col">Mã phiếu</th>
                <th className="px-4 py-3 text-left" scope="col">Khách hàng bán</th>
                <th className="px-4 py-3 text-left" scope="col">Sách thu mua</th>
                <th className="px-3 py-3 text-right" scope="col">Tổng tiền đề xuất</th>
                <th className="px-4 py-3 text-left" scope="col">Lý do vượt hạn mức</th>
                <th className="px-3 py-3 text-left" scope="col">Người lập</th>
                <th className="px-3 py-3 text-left" scope="col">Ngày gửi</th>
                <th className="px-3 py-3 text-left" scope="col">Trạng thái</th>
                <th className="px-4 py-3 text-right" scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-12 text-center text-slate-400" colSpan={9}>
                    Đang tải danh sách phiếu thu mua chờ duyệt...
                  </td>
                </tr>
              ) : !pageResult?.items || pageResult.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-slate-500" colSpan={9}>
                    <p className="font-semibold text-slate-700">Không có yêu cầu thu mua nào</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Các phiếu thu mua có giá &gt; 200.000đ/cuốn sẽ xuất hiện tại đây khi quầy thu mua gửi duyệt.
                    </p>
                  </td>
                </tr>
              ) : (
                pageResult.items.map((item) => (
                  <tr
                    className="hover:bg-indigo-50/40 cursor-pointer transition"
                    key={item.id}
                    onClick={() => onSelectRequest(item.id)}
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {item.receiptCode}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-900 block">
                        {item.customerName ?? 'Khách vãng lai'}
                      </span>
                      {item.customerPhone && (
                        <span className="text-[11px] text-slate-400 block">{item.customerPhone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-800 block truncate max-w-xs">{item.titleSummary}</span>
                      <span className="text-[11px] text-slate-400">{item.itemCount} cuốn</span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatVnd(item.totalAmount)}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate text-slate-700" title={item.reason ?? ''}>
                      {item.reason ?? '—'}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap text-slate-700">
                      {item.requestedByName}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap text-slate-500">
                      {formatDateTime(item.requestedAt)}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          approvalGeneralStatusMeta(item.status).className
                        }`}
                      >
                        {approvalGeneralStatusMeta(item.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectRequest(item.id)
                        }}
                        variant="outline"
                      >
                        {item.status === 'PENDING_APPROVAL' ? 'Thẩm định' : 'Chi tiết'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageResult && pageResult.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50/50">
            <div className="text-xs text-slate-500">
              Trang <strong className="text-slate-900">{pageResult.page}</strong> / {pageResult.totalPages} (Tổng {pageResult.totalCount} bản ghi)
            </div>
            <div className="flex gap-1.5">
              <Button
                disabled={pageResult.page <= 1}
                onClick={() => handlePageChange(pageResult.page - 1)}
                variant="outline"
              >
                Trước
              </Button>
              <Button
                disabled={pageResult.page >= pageResult.totalPages}
                onClick={() => handlePageChange(pageResult.page + 1)}
                variant="outline"
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
