import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, StatCard } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { CatalogWorkspace } from '../components/CatalogWorkspace'
import { getCopyByBarcode } from '../catalog.service'
import type { BookCopy } from '../catalog.type'
import { CreateAdjustmentModal } from '@/features/approvals/components/CreateAdjustmentModal'
import type { DiscrepancyRow } from '@/features/approvals/components/CreateAdjustmentModal'
import { useApprovalsQuery, useApprovalsStatsQuery } from '@/features/approvals/approvals.hook'
import {
  approvalStatusMeta,
  copyStatusLabel,
  formatDateTime,
  formatVnd,
  varianceMeta,
} from '@/features/approvals/approvals.presentation'
import type { BookCopyStatus, InventoryVarianceType } from '@/features/approvals/approvals.type'
import { AdjustmentDetailDrawer } from '@/features/approvals/components/AdjustmentDetailDrawer'
import { useAuth } from '@/features/auth/auth.hook'

type VarianceFilter = InventoryVarianceType | ''

const FILTERS: { value: VarianceFilter; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'MISSING', label: 'Thiếu sách' },
  { value: 'DAMAGED', label: 'Hư hỏng' },
  { value: 'UNEXPECTED_STATUS', label: 'Sai trạng thái' },
]

export default function InventoryCheckPage() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const [varianceFilter, setVarianceFilter] = useState<VarianceFilter>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [scanInput, setScanInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scannedCopy, setScannedCopy] = useState<BookCopy | null>(null)
  const [scanError, setScanError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalSeed, setModalSeed] = useState(0)
  const [modalRows, setModalRows] = useState<DiscrepancyRow[] | undefined>(undefined)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  const { data: stats } = useApprovalsStatsQuery()
  const { data: pageResult, isLoading } = useApprovalsQuery({
    page,
    pageSize: 10,
    search: search.trim() || undefined,
    varianceType: varianceFilter || undefined,
  })

  const currentUserId = session?.user?.name
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.roleCode ?? '')

  const openModal = (rows?: DiscrepancyRow[]) => {
    setModalRows(rows)
    setModalSeed((seed) => seed + 1)
    setIsModalOpen(true)
  }

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const barcode = scanInput.trim()
    if (!barcode) return
    setScanning(true)
    setScanError('')
    setScannedCopy(null)
    try {
      const copy = await getCopyByBarcode(barcode)
      setScannedCopy(copy)
      setScanInput('')
    } catch (cause) {
      setScanError(cause instanceof Error ? cause.message : 'Không tìm thấy bản sách với mã vạch này.')
    } finally {
      setScanning(false)
    }
  }

  const handleCreateFromScan = () => {
    if (!scannedCopy) return
    openModal([
      {
        id: `scan-${scannedCopy.id}`,
        copyBarcode: scannedCopy.copyBarcode,
        systemStatus: copyStatusLabel(scannedCopy.status as BookCopyStatus),
        varianceType: 'MISSING',
        requestedStatus: 'LOST',
        reason: '',
      },
    ])
  }

  const items = pageResult?.items ?? []

  return (
    <CatalogWorkspace
      action={
        <div className="flex gap-2">
          <Button onClick={() => openModal()} variant="primary">
            Lập Đề nghị Điều chỉnh Kho →
          </Button>
        </div>
      }
      title="Kiểm kê kho định kỳ & Đối soát sai lệch"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            description="Tất cả đề nghị điều chỉnh"
            label="Tổng đề nghị"
            value={stats?.total ?? 0}
          />
          <StatCard
            description="Đang chờ quản lý duyệt"
            label="Chờ duyệt"
            value={stats?.pendingApproval ?? 0}
            valueColor="amber"
          />
          <StatCard
            description="Đã duyệt hoặc đã áp dụng vào kho"
            label="Đã duyệt & Áp dụng"
            value={(stats?.approved ?? 0) + (stats?.applied ?? 0)}
            valueColor="emerald"
          />
          <StatCard
            description="Từ chối hoặc người tạo hủy"
            label="Từ chối / Đã hủy"
            value={(stats?.rejected ?? 0) + (stats?.cancelled ?? 0)}
            valueColor="rose"
          />
        </div>

        <section aria-label="Tra cứu bản sách bằng mã vạch" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Quét kiểm kê bằng CopyBarcode</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quét hoặc nhập CopyBarcode để đối chiếu trạng thái thực tế với hệ thống. Không tự động điều chỉnh tồn kho khi chưa được phê duyệt.
            </p>
          </div>

          <form className="flex gap-2" onSubmit={(e) => void handleScanSubmit(e)}>
            <input
              className="w-full rounded-xl border-2 border-indigo-200 bg-indigo-50/20 py-3 px-4 font-mono text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-hidden"
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Quét hoặc nhập CopyBarcode..."
              type="text"
              value={scanInput}
            />
            <Button disabled={scanning} type="submit" variant="primary">
              {scanning ? 'Đang tra cứu...' : 'Tra cứu'}
            </Button>
          </form>

          {scanError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert">
              {scanError}
            </div>
          )}

          {scannedCopy && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-mono text-sm font-bold text-indigo-700">{scannedCopy.copyBarcode}</p>
                <p>
                  Trạng thái hệ thống:{' '}
                  <strong>{copyStatusLabel(scannedCopy.status as BookCopyStatus)}</strong>
                  {' - '}Vị trí kệ: <strong>{scannedCopy.shelfCode || '—'}</strong>
                  {' - '}Giá bán: <strong>{formatVnd(scannedCopy.sellingPrice)}</strong>
                </p>
              </div>
              <Button onClick={handleCreateFromScan} variant="outline">
                Lập đề nghị cho bản sách này
              </Button>
            </div>
          )}
        </section>

        <section aria-label="Danh sách đề nghị điều chỉnh" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Đối soát sai lệch đã ghi nhận</h3>
            <p className="text-xs text-slate-500 mt-0.5">Các đề nghị điều chỉnh kho phát sinh từ kiểm kê, lấy trực tiếp từ hệ thống.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((filter) => (
                <button
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    varianceFilter === filter.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  key={filter.value || 'ALL'}
                  onClick={() => {
                    setVarianceFilter(filter.value)
                    setPage(1)
                  }}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <input
              className="w-64 rounded-lg border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Tìm mã yêu cầu, barcode, tên sách..."
              type="search"
              value={search}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 text-left" scope="col">Mã yêu cầu</th>
                  <th className="px-4 py-2.5 text-left" scope="col">Barcode / Đầu sách</th>
                  <th className="px-4 py-2.5 text-left" scope="col">Sai lệch</th>
                  <th className="px-4 py-2.5 text-left" scope="col">Trạng thái đề xuất</th>
                  <th className="px-4 py-2.5 text-left" scope="col">Giải trình</th>
                  <th className="px-4 py-2.5 text-left" scope="col">Ngày gửi</th>
                  <th className="px-4 py-2.5 text-left" scope="col">Xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-400" colSpan={7}>Đang tải dữ liệu...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>Chưa có đề nghị điều chỉnh nào.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      className="hover:bg-indigo-50/40 cursor-pointer"
                      key={item.id}
                      onClick={() => setSelectedRequestId(item.id)}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-indigo-700 whitespace-nowrap">{item.requestCode}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-slate-900 block">{item.copyBarcode}</span>
                        <span className="text-slate-600 text-[11px] block">{item.titleName}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] ${varianceMeta(item.varianceType).className}`}>
                          {varianceMeta(item.varianceType).label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {copyStatusLabel(item.originalStatus)} → <strong className="text-indigo-700">{copyStatusLabel(item.requestedStatus)}</strong>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-600" title={item.reason}>{item.reason}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDateTime(item.requestedAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${approvalStatusMeta(item.status).className}`}>
                          {approvalStatusMeta(item.status).label}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pageResult && pageResult.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Trang <strong className="text-slate-900">{pageResult.page}</strong> / {pageResult.totalPages} (Tổng {pageResult.totalCount} bản ghi)
              </span>
              <div className="flex gap-1.5">
                <Button disabled={pageResult.page <= 1} onClick={() => setPage(pageResult.page - 1)} variant="outline">
                  Trước
                </Button>
                <Button disabled={pageResult.page >= pageResult.totalPages} onClick={() => setPage(pageResult.page + 1)} variant="outline">
                  Sau
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <AdjustmentDetailDrawer
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onClose={() => setSelectedRequestId(null)}
        requestId={selectedRequestId}
      />

      <CreateAdjustmentModal
        initialRows={modalRows}
        isOpen={isModalOpen}
        key={modalSeed}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          notify.success('Đã gửi đề nghị điều chỉnh thành công! Đang chuyển đến Trung tâm Phê duyệt...')
          navigate('/approvals')
        }}
      />
    </CatalogWorkspace>
  )
}
