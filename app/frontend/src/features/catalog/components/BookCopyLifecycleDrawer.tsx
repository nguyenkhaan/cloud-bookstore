import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Printer,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/common'
import { useAuth } from '@/features/auth/auth.hook'
import {
  useCopyHistoryQuery,
  useCopyQuery,
  useCreateCopyLabelMutation,
  useUpdateCopyShelfMutation,
} from '../catalog.hook'
import { copyStatusMeta, formatVnd } from '../catalog.presentation'
import type { BookCopy, BookCopyHistoryItem, BookCopyLabelResponse } from '../catalog.type'

export interface BookCopyLifecycleDrawerProps {
  copyId: string | null
  initialCopy?: BookCopy | null
  onClose: () => void
}

function formatVnDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function eventVisual(item: BookCopyHistoryItem): {
  title: string
  bgClass: string
  icon: React.ReactNode
} {
  switch (item.eventType) {
    case 'RECEIPT_LINKED':
      return {
        title: item.metadata?.supplierName ? 'Nhập kho mới từ NCC / Nguồn nhập' : 'Nhập kho mới',
        bgClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        icon: <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />,
      }
    case 'RENTAL':
      return {
        title: 'Cho thuê',
        bgClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        icon: <ArrowUpRight className="h-4 w-4" aria-hidden="true" />,
      }
    case 'RETURN':
      return {
        title: 'Nhận trả sách',
        bgClass: 'bg-sky-100 text-sky-700 border-sky-200',
        icon: <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />,
      }
    case 'INVENTORY_CHECK':
      return {
        title: 'Kiểm kê định kỳ',
        bgClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: <Check className="h-4 w-4" aria-hidden="true" />,
      }
    case 'SALE':
    case 'SALE_REVERSED':
      return {
        title: item.eventType === 'SALE_REVERSED' ? 'Hủy giao dịch bán' : 'Bán tại quầy',
        bgClass: item.eventType === 'SALE_REVERSED'
          ? 'bg-rose-100 text-rose-700 border-rose-200'
          : 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: <ShoppingBag className="h-4 w-4" aria-hidden="true" />,
      }
    case 'BOOK_COPY_SHELF_UPDATE':
      return {
        title: 'Chuyển vị trí kệ',
        bgClass: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: <RefreshCw className="h-4 w-4" aria-hidden="true" />,
      }
    default:
      return {
        title: item.summary.replace(/\.$/, '') || item.eventType,
        bgClass: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
      }
  }
}

function conditionLabel(cond?: string | null): string {
  switch (cond) {
    case 'INTACT':
      return 'Nguyên vẹn'
    case 'DAMAGED':
      return 'Hư hỏng'
    case 'LOST':
      return 'Mất sách'
    default:
      return cond || '—'
  }
}

export const BookCopyLifecycleDrawer: React.FC<BookCopyLifecycleDrawerProps> = ({
  copyId,
  initialCopy = null,
  onClose,
}) => {
  const { session } = useAuth()
  const canMutate = ['ADMIN', 'INVENTORY_MANAGER'].includes(session?.user?.roleCode ?? '')

  const copyQuery = useCopyQuery(copyId ?? '')
  const historyQuery = useCopyHistoryQuery(copyId ?? '')
  const createLabelMutation = useCreateCopyLabelMutation()
  const updateShelfMutation = useUpdateCopyShelfMutation()

  const [isShelfFormOpen, setIsShelfFormOpen] = useState(false)
  const [newShelfCode, setNewShelfCode] = useState('')
  const [shelfReason, setShelfReason] = useState('')
  const [shelfError, setShelfError] = useState('')
  const [printedLabel, setPrintedLabel] = useState<BookCopyLabelResponse | null>(null)

  const copy = copyQuery.data ?? initialCopy

  useEffect(() => {
    if (!copyId) return
    setIsShelfFormOpen(false)
    setShelfError('')
    setShelfReason('')
    setPrintedLabel(null)
    setNewShelfCode(copy?.shelfCode ?? '')
  }, [copyId, copy?.shelfCode])

  useEffect(() => {
    if (!copyId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (printedLabel) {
          setPrintedLabel(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [copyId, onClose, printedLabel])

  if (!copyId) return null

  const statusMeta = copy ? copyStatusMeta[copy.status] : null
  const history = historyQuery.data ?? []
  const isLockedForShelf = copy?.status === 'RENTED' || copy?.status === 'SOLD'

  const subtitleParts = [
    copy?.titleName,
    copy?.volumeLabel,
    copy?.editionStatement
      ? `(${copy.editionStatement})`
      : copy?.publishYear
        ? `(KĐ ${copy.publishYear})`
        : null,
  ].filter(Boolean)

  const handleReprintLabel = async () => {
    try {
      const label = await createLabelMutation.mutateAsync(copyId)
      setPrintedLabel(label)
      toast.success(`Đã tạo tem tái in lần ${label.printCount} cho ${label.copyBarcode}.`)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Không thể tạo tem dán gáy.')
    }
  }

  const handleShelfSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setShelfError('')
    const trimmedReason = shelfReason.trim()
    if (!trimmedReason) {
      setShelfError('Vui lòng nhập lý do chuyển vị trí kệ.')
      return
    }
    try {
      await updateShelfMutation.mutateAsync({
        copyId,
        request: {
          shelfCode: newShelfCode.trim() || null,
          reason: trimmedReason,
        },
      })
      toast.success(`Đã cập nhật vị trí kệ cho ${copy?.copyBarcode ?? 'bản sách'}.`)
      setIsShelfFormOpen(false)
      setShelfReason('')
    } catch (cause) {
      setShelfError(cause instanceof Error ? cause.message : 'Không thể chuyển vị trí kệ.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-inv-03-title">
      <div
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                DRAWER-INV-03 / LỊCH SỬ 360°
              </p>
              <h2 id="drawer-inv-03-title" className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
                {copy?.copyBarcode ?? 'Đang tải...'}
              </h2>
              {subtitleParts.length > 0 && (
                <p className="mt-1 text-sm text-slate-600">{subtitleParts.join(' · ')}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng ngăn lịch sử bản sách"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {copy && statusMeta && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  statusMeta.tone === 'emerald'
                    ? 'bg-emerald-50 text-emerald-700'
                    : statusMeta.tone === 'amber'
                      ? 'bg-amber-50 text-amber-700'
                      : statusMeta.tone === 'rose'
                        ? 'bg-rose-50 text-rose-700'
                        : statusMeta.tone === 'indigo'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-100 text-slate-700'
                }`}
              >
                {statusMeta.label} (Grade {copy.conditionGrade})
              </span>
              <span className="text-xs font-medium text-slate-600">
                {copy.shelfCode ? `Kệ ${copy.shelfCode}` : 'Chưa gán kệ'}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Lịch sử vòng đời</h3>
            <span className="text-xs font-medium text-slate-500">{history.length} sự kiện</span>
          </div>

          {historyQuery.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : historyQuery.error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              Không thể tải lịch sử vòng đời bản sách. Vui lòng thử lại.
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              Chưa có sự kiện vòng đời nào được ghi nhận cho bản sách này.
            </div>
          ) : (
            <ol className="relative space-y-5 border-l-2 border-slate-200 pl-6 ml-3">
              {history.map((item, idx) => {
                const visual = eventVisual(item)
                const meta = item.metadata
                return (
                  <li key={`${item.eventType}-${item.occurredAt}-${idx}`} className="relative">
                    <span
                      className={`absolute -left-9.5 top-0 flex h-7 w-7 items-center justify-center rounded-full border ${visual.bgClass}`}
                    >
                      {visual.icon}
                    </span>

                    <div className="text-xs font-medium text-slate-500">
                      {formatVnDateTime(item.occurredAt)}
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-slate-900">{visual.title}</div>
                    {item.referenceCode && (
                      <div className="mt-0.5 text-xs font-semibold text-indigo-600">
                        {item.referenceCode}
                      </div>
                    )}

                    <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/90 px-3.5 py-2.5 text-xs text-slate-700 space-y-1">
                      {item.eventType === 'RECEIPT_LINKED' && (
                        <>
                          {meta?.costPrice != null && (
                            <p className="font-semibold text-slate-900">Giá vốn: {formatVnd(meta.costPrice)}</p>
                          )}
                          {meta?.supplierName && <p>Nguồn: {meta.supplierName}</p>}
                          {item.actorName && <p className="text-slate-600">Người nhập: {item.actorName}</p>}
                        </>
                      )}

                      {item.eventType === 'RENTAL' && (
                        <>
                          {meta?.customerName && (
                            <p className="font-semibold text-slate-900">Khách hàng: {meta.customerName}</p>
                          )}
                          {meta?.depositAmount != null && (
                            <p className="text-slate-600">Tiền cọc: {formatVnd(meta.depositAmount)}</p>
                          )}
                        </>
                      )}

                      {item.eventType === 'RETURN' && (
                        <>
                          <p className="font-semibold text-slate-900">
                            {conditionLabel(meta?.copyCondition)}
                            {copy ? ` Grade ${copy.conditionGrade}` : ''}
                          </p>
                          <p className="text-slate-600">
                            {meta?.refundAmount != null && meta?.depositAmount != null && meta.refundAmount >= meta.depositAmount
                              ? 'Hoàn cọc đủ'
                              : meta?.refundAmount != null
                                ? `Hoàn cọc: ${formatVnd(meta.refundAmount)}`
                                : item.summary}
                          </p>
                        </>
                      )}

                      {item.eventType === 'INVENTORY_CHECK' && (
                        <>
                          <p className="font-semibold text-slate-900">
                            {meta?.shelfCode ? `Khớp kệ ${meta.shelfCode}` : item.summary}
                          </p>
                          {item.reason && <p className="text-slate-600">Ghi chú: {item.reason}</p>}
                        </>
                      )}

                      {item.eventType === 'SALE' || item.eventType === 'SALE_REVERSED' ? (
                        <>
                          {meta?.customerName && <p className="font-semibold text-slate-900">Khách hàng: {meta.customerName}</p>}
                          {meta?.sellingPrice != null && <p>Giá bán: {formatVnd(meta.sellingPrice)}</p>}
                        </>
                      ) : null}

                      {item.source === 'AUDIT_LOG' && (
                        <>
                          <p className="font-medium text-slate-800">{item.summary}</p>
                          {item.reason && <p className="text-slate-600">Lý do: {item.reason}</p>}
                          {item.actorName && <p className="text-slate-500">Thực hiện: {item.actorName}</p>}
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        {/* Inline Shelf Move Form */}
        {isShelfFormOpen && (
          <form
            onSubmit={(e) => void handleShelfSubmit(e)}
            className="border-t border-slate-200 bg-indigo-50/50 px-6 py-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-900">
                Chuyển vị trí kệ
              </h4>
              <button
                type="button"
                onClick={() => setIsShelfFormOpen(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Hủy
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              <label className="block text-xs font-medium text-slate-700">
                Mã kệ mới
                <input
                  type="text"
                  maxLength={30}
                  value={newShelfCode}
                  onChange={(e) => setNewShelfCode(e.target.value)}
                  placeholder="Ví dụ: A1-05"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Lý do bắt buộc <span className="text-rose-600">*</span>
                <input
                  type="text"
                  maxLength={500}
                  required
                  value={shelfReason}
                  onChange={(e) => setShelfReason(e.target.value)}
                  placeholder="Ví dụ: Dồn kệ truyện tranh thiếu nhi"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </label>
            </div>
            {shelfError && (
              <p className="text-xs font-medium text-rose-700" role="alert">
                {shelfError}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              loading={updateShelfMutation.isPending}
            >
              Xác nhận chuyển kệ
            </Button>
          </form>
        )}

        {/* Footer Actions */}
        <div className="border-t border-slate-200 bg-white px-6 py-4">
          {canMutate ? (
            <div className="space-y-2">
              {isLockedForShelf && (
                <p className="text-[11px] text-amber-700">
                  Bản sách đang ở trạng thái {statusMeta?.label}; không thể chuyển vị trí kệ lúc này.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  loading={createLabelMutation.isPending}
                  onClick={() => void handleReprintLabel()}
                >
                  In lại tem dán gáy
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="min-h-11"
                  disabled={isLockedForShelf}
                  onClick={() => {
                    setNewShelfCode(copy?.shelfCode ?? '')
                    setShelfError('')
                    setIsShelfFormOpen((prev) => !prev)
                  }}
                >
                  Chuyển vị trí kệ
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-slate-500">
              Chế độ chỉ đọc (chỉ Quản trị viên / Quản lý kho được tái in tem hoặc chuyển vị trí kệ).
            </p>
          )}
        </div>
      </aside>

      {/* Printable Spine Label Preview Modal */}
      {printedLabel && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Tem dán gáy · Lần in #{printedLabel.printCount}
              </h3>
              <button
                type="button"
                onClick={() => setPrintedLabel(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Đóng bản xem trước tem"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center space-y-1.5">
              <div className="font-mono text-lg font-extrabold tracking-widest text-slate-900">
                {printedLabel.copyBarcode}
              </div>
              <div className="text-xs font-bold text-slate-800">
                {printedLabel.titleName}
                {printedLabel.volumeLabel ? ` · ${printedLabel.volumeLabel}` : ''}
              </div>
              <div className="text-[11px] text-slate-600">
                Grade {printedLabel.conditionGrade} · Kệ {printedLabel.shelfCode || '—'}
              </div>
              <div className="pt-1 text-xs font-semibold text-indigo-700">
                Bán: {formatVnd(printedLabel.sellingPrice)} · Thuê: {formatVnd(printedLabel.rentalRate)}/ngày
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPrintedLabel(null)}>
                Đóng
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => window.print()}
              >
                <Printer className="mr-1.5 h-4 w-4" />
                In tem ngay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
