import React, { useState } from 'react'
import { Button } from '@/components/common'
import { notify } from '@/components/common/Toast'
import { useBuybackApprovalDetailQuery, useUpdateBuybackStatusMutation } from '../approvals.hook'
import {
  approvalGeneralStatusMeta,
  conditionGradeMeta,
  formatDateTime,
  formatVnd,
} from '../approvals.presentation'

export interface BuybackDetailDrawerProps {
  requestId: string | null
  onClose: () => void
  currentUserId?: string
  isAdmin: boolean
}

export const BuybackDetailDrawer: React.FC<BuybackDetailDrawerProps> = ({
  requestId,
  onClose,
  currentUserId,
  isAdmin,
}) => {
  const { data: detail, isLoading, error } = useBuybackApprovalDetailQuery(requestId)
  const updateStatusMutation = useUpdateBuybackStatusMutation()

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
      notify.success('Đã phê duyệt giá thu mua thành công.')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi khi phê duyệt.'
      setActionError(msg)
    }
  }

  const handleReject = async () => {
    if (!adminReason.trim()) {
      setActionError('Bắt buộc phải nhập lý do khi từ chối thu mua.')
      return
    }
    setActionError('')
    try {
      await updateStatusMutation.mutateAsync({
        id: requestId,
        dto: { status: 'REJECTED', reason: adminReason.trim() },
      })
      notify.success('Đã từ chối phiếu thu mua.')
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
                  {detail?.receiptCode ?? 'Phiếu thu mua'}
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
                Thẩm định & Duyệt giá thu mua sách cũ vượt hạn mức (&gt; 200.000đ/cuốn)
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
              <div className="py-12 text-center text-xs text-slate-400">Đang tải chi tiết phiếu thu mua...</div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                Không thể tải thông tin: {error instanceof Error ? error.message : 'Lỗi kết nối'}
              </div>
            )}

            {detail && (
              <>
                {/* Thông tin khách hàng & tổng quát */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block">Khách hàng bán sách</span>
                      <span className="font-semibold text-slate-900">
                        {detail.customerName ? `${detail.customerName} (${detail.customerPhone ?? '—'})` : 'Khách vãng lai'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tổng tiền chi trả đề xuất</span>
                      <span className="text-base font-bold text-indigo-700">{formatVnd(detail.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Người lập phiếu (Thu ngân)</span>
                      <span className="text-slate-800">{detail.requestedByName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Thời gian gửi</span>
                      <span className="text-slate-600">{formatDateTime(detail.requestedAt)}</span>
                    </div>
                  </div>

                  {detail.reason && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-slate-400 block">Lý do thu mua vượt hạn mức:</span>
                      <p className="mt-0.5 text-slate-800 font-medium">{detail.reason}</p>
                    </div>
                  )}
                </div>

                {/* Danh sách các cuốn sách thu mua */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Danh sách sách thu mua ({detail.lines.length} đầu sách)
                  </h4>
                  <div className="space-y-3">
                    {detail.lines.map((line) => (
                      <div
                        className="rounded-xl border border-slate-200 p-3 bg-white flex gap-3 shadow-2xs"
                        key={line.id}
                      >
                        <div className="h-20 w-16 shrink-0 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                          {line.imageUrl ? (
                            <img alt={line.titleName} className="h-full w-full object-cover" src={line.imageUrl} />
                          ) : (
                            <span className="text-[10px] text-slate-400 text-center px-1">Ảnh bìa</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1 text-xs">
                          <p className="font-bold text-slate-900 truncate">{line.titleName}</p>
                          <div className="flex items-center gap-2 text-slate-500">
                            {line.editionName && <span>NXB: {line.editionName}</span>}
                            {line.isbn && <span className="font-mono">ISBN: {line.isbn}</span>}
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                                conditionGradeMeta(line.conditionGrade).className
                              }`}
                            >
                              {conditionGradeMeta(line.conditionGrade).label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 text-[11px]">
                            <span className="text-slate-500">Giá bìa: {formatVnd(line.coverPrice)}</span>
                            <span className="font-bold text-indigo-700">
                              Giá thỏa thuận: {formatVnd(line.proposedPrice)} × {line.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ảnh bằng chứng hiện trạng nếu có */}
                {detail.imageUrls && detail.imageUrls.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Ảnh chụp thực tế cuốn sách ({detail.imageUrls.length} ảnh)
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
                          <img alt={`Bằng chứng ${idx + 1}`} className="h-full w-full object-cover group-hover:scale-105 transition" src={img} />
                          <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                            Xem ảnh lớn ↗
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nhật ký thẩm định & phê duyệt */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Lịch sử xử lý phê duyệt
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
                      <p className="text-xs text-slate-400 italic">Chưa có bản ghi nhật ký.</p>
                    )}
                  </div>
                </div>

                {/* Người duyệt hoặc từ chối */}
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
                  ⚠️ Bạn là người lập yêu cầu thu mua này. Theo quy định kiểm soát tách biệt (Dual Control), một tài khoản Quản lý khác phải phê duyệt.
                </div>
              ) : isAdmin ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="admin-reason">
                      Ghi chú phê duyệt / Lý do từ chối (bắt buộc khi từ chối):
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-hidden"
                      id="admin-reason"
                      onChange={(e) => setAdminReason(e.target.value)}
                      placeholder="Nhập ý kiến thẩm định của Quản lý..."
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
                      Từ chối thu mua
                    </Button>
                    <Button
                      disabled={updateStatusMutation.isPending}
                      onClick={handleApprove}
                      variant="primary"
                    >
                      {updateStatusMutation.isPending ? 'Đang duyệt...' : 'Phê duyệt giá thỏa thuận'}
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
