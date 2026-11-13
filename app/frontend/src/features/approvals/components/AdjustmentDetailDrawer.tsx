import React, { useState } from 'react'
import { Button } from '@/components/common'
import {
  useApprovalDetailQuery,
  useCancelApprovalMutation,
  useUpdateApprovalStatusMutation,
} from '../approvals.hook'
import {
  approvalStatusMeta,
  copyStatusLabel,
  formatDateTime,
  formatVnd,
  varianceMeta,
} from '../approvals.presentation'
import type { InventoryAdjustmentStatus } from '../approvals.type'

export interface AdjustmentDetailDrawerProps {
  requestId: string | null
  onClose: () => void
  currentUserId?: string
  isAdmin: boolean
}

function auditActionLabel(action: string): string {
  switch (action) {
    case 'INVENTORY_ADJUSTMENT_CREATED':
      return 'Lập đề nghị điều chỉnh kho'
    case 'INVENTORY_ADJUSTMENT_APPROVED':
      return 'Quản lý phê duyệt đề xuất'
    case 'INVENTORY_ADJUSTMENT_APPLIED':
      return 'Áp dụng cập nhật trạng thái kho'
    case 'INVENTORY_ADJUSTMENT_REJECTED':
      return 'Từ chối đề xuất điều chỉnh'
    case 'INVENTORY_ADJUSTMENT_CANCELLED':
      return 'Người tạo hủy yêu cầu'
    case 'BOOK_COPY_STATUS_UPDATED':
      return 'Cập nhật trạng thái bản sách vật lý'
    default:
      return action
  }
}

export const AdjustmentDetailDrawer: React.FC<AdjustmentDetailDrawerProps> = ({
  requestId,
  onClose,
  currentUserId,
  isAdmin,
}) => {
  const { data: detail, isLoading, error } = useApprovalDetailQuery(requestId)
  const updateStatusMutation = useUpdateApprovalStatusMutation()
  const cancelMutation = useCancelApprovalMutation()

  const [adminReason, setAdminReason] = useState('')
  const [actionError, setActionError] = useState('')
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  if (!requestId) return null

  const isSelfRequest = Boolean(
    currentUserId && detail?.requestedBy && currentUserId.toLowerCase() === detail.requestedBy.toLowerCase(),
  )
  const canAdminDecide = isAdmin && !isSelfRequest && (detail?.status === 'PENDING_APPROVAL' || detail?.status === 'APPROVED')
  const canCreatorCancel = isSelfRequest && detail?.status === 'PENDING_APPROVAL'

  const handleAdminDecision = async (status: InventoryAdjustmentStatus) => {
    if (!detail) return
    setActionError('')
    try {
      await updateStatusMutation.mutateAsync({
        id: detail.id,
        dto: {
          status,
          reason: adminReason.trim() || undefined,
        },
      })
      setAdminReason('')
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Thao tác không thành công.')
    }
  }

  const handleCancelRequest = async () => {
    if (!detail) return
    setActionError('')
    try {
      await cancelMutation.mutateAsync({
        id: detail.id,
        dto: {
          reason: cancelReason.trim() || undefined,
        },
      })
      setIsConfirmingCancel(false)
      setCancelReason('')
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Không thể hủy yêu cầu.')
    }
  }

  return (
    <div
      aria-labelledby="drawer-title"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
    >
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900" id="drawer-title">
                {detail?.requestCode || 'Chi tiết yêu cầu'}
              </h2>
              {detail && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${approvalStatusMeta(detail.status).className}`}>
                  {approvalStatusMeta(detail.status).label}
                </span>
              )}
            </div>
            <button
              aria-label="Đóng bảng chi tiết"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              onClick={onClose}
              type="button"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading && (
              <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
                Đang tải thông tin chi tiết...
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
                {error instanceof Error ? error.message : 'Không tìm thấy yêu cầu điều chỉnh kho.'}
              </div>
            )}

            {actionError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
                {actionError}
              </div>
            )}

            {detail && (
              <>
                <section aria-label="Thông tin bản sách" className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mã vạch cuốn sách</span>
                      <h3 className="text-lg font-mono font-bold text-indigo-700">{detail.copyBarcode}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{detail.titleName}</p>
                      {detail.editionStatement && (
                        <p className="text-xs text-slate-500">{detail.editionStatement}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs ${varianceMeta(detail.varianceType).className}`}>
                      {varianceMeta(detail.varianceType).label}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 text-xs sm:grid-cols-4">
                    <div>
                      <span className="text-slate-500">Trạng thái gốc:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{copyStatusLabel(detail.originalStatus)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Đề xuất chuyển:</span>
                      <p className="font-semibold text-indigo-700 mt-0.5">{copyStatusLabel(detail.requestedStatus)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Giá bán:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{formatVnd(detail.sellingPrice)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Vị trí kệ:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{detail.shelfCode || '—'}</p>
                    </div>
                  </div>
                </section>

                <section aria-label="Nội dung giải trình" className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lý do điều chỉnh / Giải trình chênh lệch</span>
                    <p className="mt-1 text-sm text-slate-800 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
                      {detail.reason}
                    </p>
                  </div>

                  {detail.checkNote && (
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ghi chú kiểm kê đợt</span>
                      <p className="mt-1 text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                        {detail.checkNote}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-600 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400">Người lập yêu cầu:</span>
                      <p className="font-medium text-slate-800">{detail.requestedByName || detail.requestedBy}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Thời điểm gửi:</span>
                      <p className="font-medium text-slate-800">{formatDateTime(detail.requestedAt)}</p>
                    </div>
                  </div>
                </section>

                {isSelfRequest && isAdmin && detail.status === 'PENDING_APPROVAL' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex items-center gap-2">
                    <svg className="h-5 w-5 shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path clipRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" fillRule="evenodd" />
                    </svg>
                    <span>Bạn là người tạo đề nghị này. Theo nguyên tắc kiểm soát chéo (SoD), bạn không thể tự phê duyệt yêu cầu của chính mình.</span>
                  </div>
                )}

                {canAdminDecide && (
                  <section aria-label="Xử lý phê duyệt" className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">Quyết định của Quản trị viên (Admin)</h4>
                    <div>
                      <label className="block text-xs font-medium text-slate-700" htmlFor="admin-decision-reason">
                        Ghi chú phê duyệt / Lý do từ chối
                      </label>
                      <textarea
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        id="admin-decision-reason"
                        onChange={(e) => setAdminReason(e.target.value)}
                        placeholder="Nhập nhận xét hoặc căn cứ phê duyệt / từ chối..."
                        rows={2}
                        value={adminReason}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {detail.status === 'PENDING_APPROVAL' && (
                        <Button
                          disabled={updateStatusMutation.isPending}
                          onClick={() => void handleAdminDecision('APPROVED')}
                          variant="secondary"
                        >
                          Phê duyệt đề xuất
                        </Button>
                      )}

                      <Button
                        disabled={updateStatusMutation.isPending}
                        onClick={() => void handleAdminDecision('APPLIED')}
                        variant="primary"
                      >
                        Áp dụng cập nhật kho
                      </Button>

                      <Button
                        disabled={updateStatusMutation.isPending}
                        onClick={() => void handleAdminDecision('REJECTED')}
                        variant="danger"
                      >
                        Từ chối yêu cầu
                      </Button>
                    </div>
                  </section>
                )}

                {canCreatorCancel && (
                  <section aria-label="Hủy yêu cầu" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    {!isConfirmingCancel ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Yêu cầu này do bạn tạo và đang chờ duyệt.</span>
                        <Button
                          onClick={() => setIsConfirmingCancel(true)}
                          variant="outline"
                        >
                          Hủy yêu cầu
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="block text-xs font-medium text-slate-700" htmlFor="cancel-reason">
                          Lý do hủy yêu cầu *
                        </label>
                        <input
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-rose-500 focus:outline-hidden"
                          id="cancel-reason"
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Ví dụ: Đã tìm thấy sách, nhập nhầm mã vạch..."
                          type="text"
                          value={cancelReason}
                        />
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => setIsConfirmingCancel(false)} variant="ghost">
                            Quay lại
                          </Button>
                          <Button
                            disabled={cancelMutation.isPending || !cancelReason.trim()}
                            onClick={() => void handleCancelRequest()}
                            variant="danger"
                          >
                            Xác nhận hủy
                          </Button>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                <section aria-label="Lịch sử kiểm toán" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Lịch sử xử lý & Kiểm toán</h4>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {detail.auditLogs.length} sự kiện
                    </span>
                  </div>

                  <div className="relative border-l-2 border-slate-200 pl-4 space-y-5 ml-2">
                    {detail.auditLogs.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Chưa có lịch sử thay đổi.</p>
                    ) : (
                      detail.auditLogs.map((log) => (
                        <div className="relative group" key={log.id}>
                          <span className="absolute -left-5.25 top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-600 shadow-xs" />
                          <div className="flex flex-wrap items-baseline justify-between gap-1">
                            <span className="text-xs font-semibold text-slate-900">
                              {auditActionLabel(log.action)}
                            </span>
                            <time className="text-[11px] text-slate-400">
                              {formatDateTime(log.timestamp)}
                            </time>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Thực hiện bởi: <span className="font-medium text-slate-800">{log.performedByName || log.performedBy || 'Hệ thống'}</span>
                          </p>
                          {log.details && (
                            <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded p-2 border border-slate-100">
                              {log.details}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )}
          </div>

          <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end">
            <Button onClick={onClose} variant="outline">
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
