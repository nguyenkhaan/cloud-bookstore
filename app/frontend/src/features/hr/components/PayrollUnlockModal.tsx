import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { notify } from '@/components/common/Toast'
import { cn } from '@/lib/cn'
import { useUnlockPayrollMutation } from '../hr-payroll.hook'

export interface PayrollUnlockModalProps {
  isOpen: boolean
  periodKey: string
  payrollCode: string
  actorName: string
  onClose: () => void
  onSuccess?: () => void
}

export function PayrollUnlockModal({
  isOpen,
  periodKey,
  payrollCode,
  actorName,
  onClose,
  onSuccess,
}: PayrollUnlockModalProps) {
  if (!isOpen) return null
  return (
    <PayrollUnlockModalForm
      actorName={actorName}
      onClose={onClose}
      onSuccess={onSuccess}
      payrollCode={payrollCode}
      periodKey={periodKey}
    />
  )
}

function PayrollUnlockModalForm({
  periodKey,
  payrollCode,
  actorName,
  onClose,
  onSuccess,
}: Omit<PayrollUnlockModalProps, 'isOpen'>) {
  const titleId = useId()
  const descId = useId()
  const reasonId = useId()
  const errorId = useId()

  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const unlockMutation = useUnlockPayrollMutation()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !unlockMutation.isPending) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, unlockMutation.isPending])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) {
      setReasonError('Vui lòng nhập lý do mở khóa bảng lương.')
      return
    }
    setReasonError(null)

    try {
      await unlockMutation.mutateAsync({
        periodKey,
        reason: trimmed,
        actorName,
      })
      notify.success(`Đã mở khóa ${payrollCode} về trạng thái Bản nháp.`)
      onSuccess?.()
      onClose()
    } catch (error) {
      setReasonError(
        error instanceof Error ? error.message : 'Không thể mở khóa bảng lương.',
      )
    }
  }

  return (
    <div
      aria-describedby={descId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !unlockMutation.isPending) {
          onClose()
        }
      }}
      role="dialog"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id={titleId}>
              Mở khóa bảng lương
            </h2>
            <p className="mt-0.5 text-xs text-slate-500" id={descId}>
              {payrollCode} · Đã duyệt, chưa thanh toán
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại mở khóa"
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            disabled={unlockMutation.isPending}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" noValidate onSubmit={handleSubmit}>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Chỉ có thể mở khóa khi chưa phát sinh khoản chi. Sau khi chỉnh sửa,
            bảng lương phải được duyệt lại.
          </div>

          <div>
            <label
              className="block text-xs font-semibold text-slate-700"
              htmlFor={reasonId}
            >
              Lý do mở khóa <span className="text-rose-600">*</span>
            </label>
            <textarea
              aria-describedby={reasonError ? errorId : undefined}
              aria-invalid={reasonError ? true : undefined}
              className={cn(
                'mt-1.5 min-h-[104px] w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15',
                reasonError ? 'border-rose-400' : 'border-slate-200',
              )}
              data-testid="hrm05-unlock-reason-input"
              id={reasonId}
              onChange={(event) => {
                setReason(event.target.value)
                if (reasonError && event.target.value.trim()) {
                  setReasonError(null)
                }
              }}
              placeholder="Nhập lý do cần điều chỉnh bảng lương..."
              value={reason}
            />
            {reasonError && (
              <p className="mt-1.5 text-xs font-medium text-rose-600" id={errorId}>
                {reasonError}
              </p>
            )}
          </div>

          <div className="space-y-0.5 text-xs text-slate-500">
            <p>Người thực hiện: {actorName} · Quản trị viên</p>
            <p>Thao tác và lý do được lưu trong lịch sử.</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              className="min-h-[44px]"
              disabled={unlockMutation.isPending}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <Button
              className="min-h-[44px]"
              data-testid="hrm05-unlock-confirm-btn"
              disabled={unlockMutation.isPending}
              type="submit"
              variant="primary"
            >
              {unlockMutation.isPending ? 'Đang mở khóa…' : 'Xác nhận mở khóa'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
