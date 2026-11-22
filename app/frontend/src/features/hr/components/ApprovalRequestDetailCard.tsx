import { useId, useState } from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { notify } from '@/components/common/Toast'
import { cn } from '@/lib/cn'
import {
  HR_REQUEST_STATUS_LABELS,
  HR_REQUEST_TYPE_LABELS,
} from '../hr-requests.mock'
import { useReviewHrRequestMutation } from '../hr-requests.hook'
import type { HrRequestRecord } from '../hr-requests.type'

export interface ApprovalRequestDetailCardProps {
  request: HrRequestRecord | null
  isAdmin: boolean
  reviewerName: string
  reviewerRoleLabel: string
  onReviewed?: (updated: HrRequestRecord) => void
}

function DetailFieldBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  )
}

export function ApprovalRequestDetailCard({
  request,
  isAdmin,
  reviewerName,
  reviewerRoleLabel,
  onReviewed,
}: ApprovalRequestDetailCardProps) {
  const noteId = useId()
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const reviewMutation = useReviewHrRequestMutation()

  if (!request) {
    return (
      <Card padding="lg" title="Chi tiết yêu cầu cần duyệt">
        <p className="py-6 text-center text-xs text-slate-500">
          Chọn một đơn trong danh sách để xem chi tiết và xét duyệt.
        </p>
      </Card>
    )
  }

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    const trimmedNote = note.trim()
    if (!trimmedNote) {
      setNoteError('Vui lòng nhập ghi chú xét duyệt trước khi xác nhận.')
      return
    }

    setNoteError(null)
    try {
      const updated = await reviewMutation.mutateAsync({
        requestId: request.id,
        decision,
        note: trimmedNote,
        reviewerName,
        reviewerRoleLabel,
      })
      notify.success(
        decision === 'approved'
          ? `Đã phê duyệt đơn ${updated.code}.`
          : `Đã từ chối đơn ${updated.code}.`,
      )
      setNote('')
      onReviewed?.(updated)
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật trạng thái đơn.',
      )
    }
  }

  return (
    <Card padding="lg">
      <div>
        <h3 className="text-base font-bold text-slate-900">
          Chi tiết yêu cầu cần duyệt
        </h3>
        <p className="mt-0.5 text-sm font-bold text-slate-900">
          {request.code} · {request.requesterName}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <DetailFieldBox
          label="Loại yêu cầu *"
          value={HR_REQUEST_TYPE_LABELS[request.type]}
        />
        <DetailFieldBox label="Ngày áp dụng *" value={request.applyDate} />

        {request.type === 'shift_swap' && (
          <>
            <DetailFieldBox
              label="Ca hiện tại *"
              value={request.currentShiftLabel}
            />
            {request.targetShiftLabel && (
              <DetailFieldBox
                label="Ca muốn đổi *"
                value={request.targetShiftLabel}
              />
            )}
            <DetailFieldBox
              label="Nhân viên thay thế *"
              value={request.replacementLabel ?? request.replacementName}
            />
          </>
        )}

        {request.type === 'leave' && (
          <>
            <DetailFieldBox
              label="Ca xin nghỉ *"
              value={request.currentShiftLabel}
            />
            <DetailFieldBox
              label="Nhân viên thay thế *"
              value={request.replacementLabel ?? request.replacementName}
            />
          </>
        )}

        {request.type === 'attendance_explanation' && (
          <>
            <DetailFieldBox
              label="Ca chấm công *"
              value={request.currentShiftLabel}
            />
            {request.correctTimeRange && (
              <DetailFieldBox
                label="Thời gian đúng *"
                value={request.correctTimeRange}
              />
            )}
          </>
        )}

        <DetailFieldBox label="Lý do *" value={request.reason} />

        {request.attachmentLabel && (
          <DetailFieldBox
            label="Bằng chứng / Tệp đính kèm"
            value={request.attachmentLabel}
          />
        )}

        {request.validationNotice && (
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs text-emerald-700">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{request.validationNotice}</span>
          </div>
        )}

        {request.status !== 'pending' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-700">
            <div className="font-semibold text-slate-900">
              Kết quả: {HR_REQUEST_STATUS_LABELS[request.status]}
            </div>
            {request.reviewNote && (
              <p className="mt-1 text-slate-600">Ghi chú: {request.reviewNote}</p>
            )}
          </div>
        )}

        {isAdmin ? (
          <div className="space-y-3 pt-1">
            <div>
              <label
                className="block text-xs font-medium text-slate-600"
                htmlFor={noteId}
              >
                Ghi chú xét duyệt *
              </label>
              <textarea
                aria-describedby={noteError ? `${noteId}-error` : undefined}
                aria-invalid={Boolean(noteError) || undefined}
                className={cn(
                  'mt-1.5 block w-full resize-none rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15',
                  noteError ? 'border-rose-500' : 'border-slate-200',
                )}
                id={noteId}
                onChange={(event) => {
                  setNote(event.target.value)
                  if (noteError) setNoteError(null)
                }}
                placeholder="Nhập lý do phê duyệt hoặc từ chối..."
                rows={3}
                value={note}
              />
              {noteError && (
                <p
                  className="mt-1 text-xs text-rose-600"
                  id={`${noteId}-error`}
                  role="alert"
                >
                  {noteError}
                </p>
              )}
            </div>

            <Button
              className="min-h-[44px]"
              data-testid="hrm04-approve-btn"
              disabled={request.status !== 'pending'}
              fullWidth
              loading={reviewMutation.isPending}
              onClick={() => void handleDecision('approved')}
              type="button"
              variant="primary"
            >
              Phê duyệt yêu cầu
            </Button>

            <Button
              className="min-h-[44px]"
              data-testid="hrm04-reject-btn"
              disabled={request.status !== 'pending'}
              fullWidth
              loading={reviewMutation.isPending}
              onClick={() => void handleDecision('rejected')}
              type="button"
              variant="secondary"
            >
              Từ chối yêu cầu
            </Button>

            <p className="text-[11px] text-slate-500">
              Yêu cầu đã duyệt mới cập nhật dữ liệu nhân sự.
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800"
            role="note"
          >
            Chỉ Quản trị viên (Admin) mới có quyền phê duyệt hoặc từ chối yêu cầu.
          </div>
        )}
      </div>
    </Card>
  )
}
