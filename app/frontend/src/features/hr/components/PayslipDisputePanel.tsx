import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { SelectBox } from '@/components/common/SelectBox'
import { notify } from '@/components/common/Toast'
import { cn } from '@/lib/cn'
import { uploadImage } from '@/features/uploads/upload.service'
import { useCreatePayslipDisputeMutation } from '../hr-payroll.hook'
import { PAYSLIP_DISPUTE_CATEGORY_OPTIONS } from '../hr-payroll.utils'
import type {
  PayslipDisputeCategory,
  PayslipDisputeRecord,
} from '../hr-payroll.type'

export interface PayslipDisputePanelProps {
  employeeId: string
  periodKey: string
  disputes: PayslipDisputeRecord[]
}

export function PayslipDisputePanel({
  employeeId,
  periodKey,
  disputes,
}: PayslipDisputePanelProps) {
  const noteId = useId()
  const noteErrorId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState<PayslipDisputeCategory>('allowance')
  const [content, setContent] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentSize, setAttachmentSize] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)
  const [selectedDispute, setSelectedDispute] =
    useState<PayslipDisputeRecord | null>(null)

  const createDisputeMutation = useCreatePayslipDisputeMutation()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) {
      setContentError('Vui lòng nhập nội dung đối chiếu.')
      return
    }
    setContentError(null)

    try {
      const created = await createDisputeMutation.mutateAsync({
        employeeId,
        periodKey,
        category,
        content: trimmed,
        attachmentName: attachmentName || undefined,
        attachmentSize: attachmentSize || undefined,
      })
      notify.success(`Đã gửi yêu cầu đối chiếu ${created.id}.`)
      setContent('')
      setAttachmentName('')
      setAttachmentSize('')
    } catch (error) {
      setContentError(
        error instanceof Error
          ? error.message
          : 'Không thể gửi yêu cầu đối chiếu.',
      )
    }
  }

  return (
    <>
      <Card
        padding="lg"
        title="Đối chiếu & Giải trình phiếu lương"
      >
        <form className="space-y-3.5" noValidate onSubmit={handleSubmit}>
          <SelectBox
            label="Khoản mục cần đối chiếu *"
            onChange={(val) => setCategory(val as PayslipDisputeCategory)}
            options={PAYSLIP_DISPUTE_CATEGORY_OPTIONS}
            searchable={false}
            value={category}
          />

          <div
            className={cn(
              'rounded-xl border bg-white px-3.5 py-2.5',
              contentError ? 'border-rose-400' : 'border-slate-200',
            )}
          >
            <label
              className="block text-xs font-semibold text-slate-600"
              htmlFor={noteId}
            >
              Nội dung đối chiếu <span className="text-rose-600">*</span>
            </label>
            <textarea
              aria-describedby={contentError ? noteErrorId : undefined}
              aria-invalid={contentError ? true : undefined}
              className="mt-1 min-h-[76px] w-full bg-transparent text-xs text-indigo-950 outline-none placeholder:text-slate-400"
              data-testid="hrm06-dispute-note-input"
              id={noteId}
              onChange={(event) => {
                setContent(event.target.value)
                if (contentError && event.target.value.trim()) {
                  setContentError(null)
                }
              }}
              placeholder="Mô tả sai lệch, ngày và ca liên quan..."
              value={content}
            />
            {contentError && (
              <p
                className="mt-1 text-xs font-medium text-rose-600"
                id={noteErrorId}
              >
                {contentError}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
            <span className="block text-xs font-semibold text-slate-600">
              Minh chứng (không bắt buộc)
            </span>
            <button
              className="mt-1 block w-full text-left text-xs text-slate-700 hover:text-indigo-700"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <span className="block font-medium">
                {attachmentName || 'Chọn ảnh hoặc kéo thả tại đây'}
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                JPG, PNG · Tối đa 5 MB
              </span>
            </button>
            <input
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setIsUploading(true)
                try {
                  await uploadImage('PAYSLIP_DISPUTE_PROOF', file)
                  setAttachmentName(file.name)
                  setAttachmentSize(`${Math.max(1, Math.round(file.size / 1024))} KB`)
                } catch (error) { notify.error(error instanceof Error ? error.message : 'Không thể tải minh chứng.') }
                finally { setIsUploading(false) }
              }}
              disabled={isUploading}
              ref={fileInputRef}
              type="file"
            />
          </div>

          <Button
            className="min-h-[44px] w-full"
            data-testid="hrm06-dispute-submit-btn"
            disabled={createDisputeMutation.isPending}
            type="submit"
            variant="primary"
          >
            {createDisputeMutation.isPending
              ? 'Đang gửi…'
              : 'Gửi yêu cầu đối chiếu'}
          </Button>
        </form>

        <div className="mt-5 space-y-2.5">
          <h3 className="text-xs font-bold text-slate-800">
            Yêu cầu đã gửi ({disputes.length})
          </h3>

          <div className="space-y-2">
            {disputes.map((dispute) => {
              const isPending = dispute.status === 'pending_response'
              return (
                <div
                  className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-xs"
                  key={dispute.id}
                >
                  <p className="font-semibold text-slate-900">
                    {dispute.id} · {dispute.categoryLabel}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 font-medium',
                      isPending ? 'text-amber-700' : 'text-emerald-600',
                    )}
                  >
                    {dispute.statusLabel}
                  </p>
                  <button
                    className="mt-1 text-xs font-medium text-indigo-600 hover:underline"
                    onClick={() => setSelectedDispute(dispute)}
                    type="button"
                  >
                    {isPending ? 'Xem yêu cầu đã gửi' : 'Xem chi tiết phản hồi'}
                  </button>
                </div>
              )
            })}
          </div>

          <p className="pt-1 text-[11px] text-slate-500">
            Chỉ bạn và Admin được xem nội dung đối chiếu.
          </p>
        </div>
      </Card>

      <PayslipDisputeDetailModal
        dispute={selectedDispute}
        onClose={() => setSelectedDispute(null)}
      />
    </>
  )
}

export function PayslipDisputeDetailModal({
  dispute,
  onClose,
}: {
  dispute: PayslipDisputeRecord | null
  onClose: () => void
}) {
  const titleId = useId()

  useEffect(() => {
    if (!dispute) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispute, onClose])

  if (!dispute) return null

  const isPending = dispute.status === 'pending_response'

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id={titleId}>
              Chi tiết phản hồi đối chiếu
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {dispute.id} · {dispute.categoryLabel} · {dispute.payslipCode}
            </p>
          </div>
          <button
            aria-label="Đóng phản hồi đối chiếu"
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5 text-xs">
          <p
            className={cn(
              'font-semibold',
              isPending ? 'text-amber-700' : 'text-emerald-600',
            )}
          >
            {dispute.statusLabel}
          </p>

          <p className="text-sm text-slate-800">{dispute.content}</p>

          {dispute.attachmentName && (
            <p className="font-medium text-indigo-600">
              {dispute.attachmentName}
              {dispute.attachmentSize ? ` · ${dispute.attachmentSize}` : ''}
            </p>
          )}

          {dispute.adminResponse ? (
            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              <p className="font-semibold text-slate-800">
                {dispute.adminName} · {dispute.adminRole} · {dispute.respondedAt}
              </p>
              <p className="text-sm text-slate-700">{dispute.adminResponse}</p>
              {dispute.calculationNote && (
                <p className="font-bold text-indigo-600">
                  {dispute.calculationNote}
                </p>
              )}
              {dispute.adjustmentNote && (
                <p className="font-semibold text-indigo-600">
                  {dispute.adjustmentNote}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 text-amber-800">
              Yêu cầu đang chờ Admin kiểm tra và phản hồi. Gửi lúc{' '}
              {dispute.submittedAt}.
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={onClose} type="button" variant="secondary">
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
