import React, { useState } from 'react'
import { Button } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { useDamagePenaltyApprovalDetailQuery, useUpdateDamagePenaltyStatusMutation } from '../approvals.hook'
import {
  approvalGeneralStatusMeta,
  formatDateTime,
  formatVnd,
} from '../approvals.presentation'

export interface DamagePenaltyDetailDrawerProps {
  requestId: string | null
  onClose: () => void
  currentUserId?: string
  isAdmin: boolean
}

export const DamagePenaltyDetailDrawer: React.FC<DamagePenaltyDetailDrawerProps> = ({
  requestId,
  onClose,
  currentUserId,
  isAdmin,
}) => {
  const { data: detail, isLoading, error } = useDamagePenaltyApprovalDetailQuery(requestId)
  const updateStatusMutation = useUpdateDamagePenaltyStatusMutation()

  const [adminReason, setAdminReason] = useState('')
  const [actionError, setActionError] = useState('')

  if (!requestId) return null

  const isSelfRequest = Boolean(
    currentUserId && detail?.requestedBy && currentUserId === detail.requestedBy
  )

  const handleApprove = async () => {
    setActionError('')
    try {
      await updateStatusMutation.mutateAsync({
        id: requestId,
        dto: { status: 'APPROVED', reason: adminReason.trim() || undefined },
      })
      notify.success('Đã phê duyệt mức phạt hư hỏng sách thành công.')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi khi phê duyệt.'
      setActionError(msg)
    }
  }

  const handleReject = async () => {
    if (!adminReason.trim()) {
      setActionError('Bắt buộc phải nhập lý do khi từ chối mức phạt đề xuất.')
      return
    }
    setActionError('')
    try {
      await updateStatusMutation.mutateAsync({
        id: requestId,
        dto: { status: 'REJECTED', reason: adminReason.trim() },
      })
      notify.success('Đã từ chối mức phạt đề xuất.')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi khi từ chối.'
      setActionError(msg)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-indigo-700">
                  {detail?.slipCode ?? 'Phiếu phạt hư hỏng'}
                </span>
                {detail && (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      approvalGeneralStatusMeta(detail.status).className
                    }`}
                  >
                    {approvalGeneralStatusMeta(detail.status).label}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Thẩm định hư hỏng ngoại lệ ngoài khung & Quyết toán cọc tại quầy trả
              </p>
            </div>
            <button
              aria-label="Đóng ngăn chi tiết"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              onClick={onClose}
              type="button"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {isLoading && (
              <div className="py-12 text-center text-xs text-slate-400">Đang tải chi tiết biên bản hư hỏng...</div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                Không thể tải thông tin: {error instanceof Error ? error.message : 'Lỗi kết nối'}
              </div>
            )}

            {detail && (
              <>
                {/* Thông tin bản sách bị hư hỏng */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-indigo-700 text-sm block">{detail.copyBarcode}</span>
                      <span className="font-bold text-slate-900 text-sm">{detail.titleName}</span>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
                      Tổn hại: {detail.penaltyPercentage}% cọc
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block">Khách hàng thuê</span>
                      <span className="font-semibold text-slate-900">
                        {detail.customerName ?? 'Khách thuê'}
                      </span>
                      {detail.customerPhone && (
                        <span className="text-slate-500 block">{detail.customerPhone}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block">Hạng thành viên</span>
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
                        {detail.customerTier ?? 'Thường'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tiền cọc đang giữ (100% giá bán)</span>
                      <span className="font-bold text-slate-900">{formatVnd(detail.depositAmount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Mức phạt khấu trừ đề xuất</span>
                      <span className="font-bold text-rose-600">{formatVnd(detail.penaltyAmount)}</span>
                    </div>
                    <div className="col-span-2 rounded-lg bg-emerald-50 p-2.5 border border-emerald-200 flex justify-between items-center">
                      <span className="font-medium text-emerald-900">Tiền cọc hoàn trả còn lại cho khách:</span>
                      <span className="font-bold text-emerald-700 text-sm">{formatVnd(detail.refundAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Mô tả chi tiết vết hỏng */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Mô tả tình trạng hư hỏng
                  </h4>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800">
                    {detail.damageDescription}
                  </div>
                </div>

                {/* Ảnh chụp vết hư hại */}
                {detail.imageUrls && detail.imageUrls.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Ảnh chụp bằng chứng hiện trạng ({detail.imageUrls.length} ảnh)
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {detail.imageUrls.map((img, idx) => (
                        <a
                          className="group relative aspect-4/3 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 block"
                          href={img}
                          key={idx}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <img alt={`Bằng chứng hư hỏng ${idx + 1}`} className="h-full w-full object-cover group-hover:scale-105 transition" src={img} />
                          <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                            Phóng to ↗
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lịch sử xử lý */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Lịch sử xử lý
                  </h4>
                  <div className="space-y-2">
                    {detail.auditHistory && detail.auditHistory.length > 0 ? (
                      detail.auditHistory.map((audit) => (
                        <div
                          className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-[11px]"
                          key={audit.id}
                        >
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="font-semibold text-slate-700">{audit.actorName ?? 'Hệ thống'}</span>
                            <span>{formatDateTime(audit.occurredAt)}</span>
                          </div>
                          <p className="mt-1 text-slate-800">{audit.reason ?? audit.action}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Chưa có nhật ký.</p>
                    )}
                  </div>
                </div>

                {/* Kết quả giải quyết nếu đã duyệt/từ chối */}
                {detail.status !== 'PENDING_APPROVAL' && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-1">
                    <span className="text-slate-400 block">Kết quả giải quyết:</span>
                    <p className="font-semibold text-slate-800">
                      Người duyệt: {detail.approvedByName ?? 'Quản lý'} ({formatDateTime(detail.approvedAt)})
                    </p>
                    {detail.rejectReason && (
                      <p className="text-rose-600 font-medium">Lý do: {detail.rejectReason}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Action Panel */}
          {detail?.status === 'PENDING_APPROVAL' && (
            <div className="border-t border-slate-200 px-6 py-4 bg-white space-y-3">
              {actionError && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
                  {actionError}
                </div>
              )}

              {isSelfRequest && isAdmin ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  ⚠️ Bạn là người gửi yêu cầu duyệt này. Vui lòng để Quản lý khác xử lý.
                </div>
              ) : isAdmin ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="damage-reason">
                      Ghi chú quyết định / Lý do từ chối:
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-hidden"
                      id="damage-reason"
                      onChange={(e) => setAdminReason(e.target.value)}
                      placeholder="Nhập ghi chú giải quyết mức bồi thường..."
                      rows={2}
                      value={adminReason}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      disabled={updateStatusMutation.isPending}
                      onClick={handleReject}
                      variant="outline"
                    >
                      Từ chối mức phạt
                    </Button>
                    <Button
                      disabled={updateStatusMutation.isPending}
                      onClick={handleApprove}
                      variant="primary"
                    >
                      {updateStatusMutation.isPending ? 'Đang duyệt...' : 'Phê duyệt & Quyết toán cọc'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center italic">
                  Chỉ tài khoản Quản trị viên (Admin) mới có quyền phê duyệt mức phạt này.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
