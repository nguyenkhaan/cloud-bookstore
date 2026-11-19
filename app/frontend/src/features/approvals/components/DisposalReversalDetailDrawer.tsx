import React, { useState } from 'react'
import { Button } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { useDisposalReversalDetailQuery, useUpdateDisposalReversalStatusMutation } from '../approvals.hook'
import {
  approvalGeneralStatusMeta,
  formatDateTime,
  formatVnd,
  reversalTypeMeta,
} from '../approvals.presentation'

export interface DisposalReversalDetailDrawerProps {
  requestId: string | null
  onClose: () => void
  currentUserId?: string
  isAdmin: boolean
}

export const DisposalReversalDetailDrawer: React.FC<DisposalReversalDetailDrawerProps> = ({
  requestId,
  onClose,
  currentUserId,
  isAdmin,
}) => {
  const { data: detail, isLoading, error } = useDisposalReversalDetailQuery(requestId)
  const updateStatusMutation = useUpdateDisposalReversalStatusMutation()

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
      notify.success('Đã phê duyệt yêu cầu thành công.')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi khi phê duyệt.'
      setActionError(msg)
    }
  }

  const handleReject = async () => {
    if (!adminReason.trim()) {
      setActionError('Bắt buộc phải nhập lý do khi từ chối yêu cầu.')
      return
    }
    setActionError('')
    try {
      await updateStatusMutation.mutateAsync({
        id: requestId,
        dto: { status: 'REJECTED', reason: adminReason.trim() },
      })
      notify.success('Đã từ chối yêu cầu.')
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
                  {detail?.referenceCode ?? 'Yêu cầu xử lý'}
                </span>
                {detail && (
                  <>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                        reversalTypeMeta(detail.requestType).className
                      }`}
                    >
                      {reversalTypeMeta(detail.requestType).label}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        approvalGeneralStatusMeta(detail.status).className
                      }`}
                    >
                      {approvalGeneralStatusMeta(detail.status).label}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Duyệt xuất hủy sách hỏng nặng hoặc đảo / hủy hóa đơn bán lẻ trong 24h
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
              <div className="py-12 text-center text-xs text-slate-400">Đang tải chi tiết yêu cầu...</div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                Không thể tải thông tin: {error instanceof Error ? error.message : 'Lỗi kết nối'}
              </div>
            )}

            {detail && (
              <>
                {/* Thông tin đối tượng yêu cầu */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block">Mã chứng từ / Mã sách</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{detail.referenceCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Số tiền hoàn / Giá trị tổn thất</span>
                      <span className="text-base font-bold text-rose-600">{formatVnd(detail.amount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Người lập đề nghị</span>
                      <span className="font-semibold text-slate-900">{detail.requestedByName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Thời gian tạo</span>
                      <span className="text-slate-600">{formatDateTime(detail.requestedAt)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 block">Lý do giải trình:</span>
                    <p className="mt-0.5 font-medium text-slate-800">{detail.reason}</p>
                  </div>

                  {detail.details && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-slate-400 block">Ghi chú bổ sung:</span>
                      <p className="mt-0.5 text-slate-700">{detail.details}</p>
                    </div>
                  )}
                </div>

                {/* Hướng dẫn nghiệp vụ */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span>💡 Lưu ý nghiệp vụ:</span>
                  </div>
                  {detail.requestType === 'HỦY_HÓA_ĐƠN_BÁN' ? (
                    <p className="text-[11px] text-indigo-800">
                      Khi Quản lý phê duyệt: Hóa đơn bán lẻ sẽ được chuyển sang trạng thái HỦY, hệ thống tự động hoàn tiền và chuyển các cuốn sách liên quan trở lại trạng thái KHẢ DỤNG trên giá kệ.
                    </p>
                  ) : (
                    <p className="text-[11px] text-indigo-800">
                      Khi Quản lý phê duyệt: Cuốn sách sẽ chuyển sang trạng thái ĐÃ THANH LÝ (DISPOSED), ghi nhận giá trị vốn tổn thất vào chi phí khấu hao cửa hàng.
                    </p>
                  )}
                </div>

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
                  ⚠️ Bạn là người lập yêu cầu này. Theo quy định kiểm soát tách biệt (Dual Control), một tài khoản Quản lý khác phải phê duyệt.
                </div>
              ) : isAdmin ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="disposal-reason">
                      Ghi chú quyết định / Lý do từ chối:
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-hidden"
                      id="disposal-reason"
                      onChange={(e) => setAdminReason(e.target.value)}
                      placeholder="Nhập ý kiến phê duyệt của Quản lý..."
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
                      Từ chối yêu cầu
                    </Button>
                    <Button
                      disabled={updateStatusMutation.isPending}
                      onClick={handleApprove}
                      variant="primary"
                    >
                      {updateStatusMutation.isPending ? 'Đang duyệt...' : 'Phê duyệt yêu cầu'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center italic">
                  Chỉ tài khoản Quản trị viên (Admin) mới có quyền phê duyệt yêu cầu này.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
