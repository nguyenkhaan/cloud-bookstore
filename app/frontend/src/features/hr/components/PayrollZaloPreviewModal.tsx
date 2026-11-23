import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { cn } from '@/lib/cn'
import { formatVnd } from '../hr-payroll.mock'
import type { ZaloSendStatus } from '../hr-payroll.type'

export interface ZaloPreviewRecipient {
  id: string
  employeeCode: string
  fullName: string
  baseSalary: number
  overtimeAmount: number
  bonus: number
  allowance: number
  deduction: number
  mandatoryContribution: number
  netPay: number
  zaloStatus: ZaloSendStatus
  zaloSentAt?: string
  zaloErrorReason?: string
}

export interface PayrollZaloPreviewModalProps {
  isOpen: boolean
  mode: 'batch' | 'single'
  codeLabel: string
  periodKey: string
  recipients: ZaloPreviewRecipient[]
  isPending?: boolean
  onClose: () => void
  onConfirm: (selectedIds: string[]) => Promise<void> | void
}

export function PayrollZaloPreviewModal({
  isOpen,
  mode,
  codeLabel,
  periodKey,
  recipients,
  isPending = false,
  onClose,
  onConfirm,
}: PayrollZaloPreviewModalProps) {
  if (!isOpen || recipients.length === 0) return null
  return (
    <PayrollZaloPreviewModalBody
      codeLabel={codeLabel}
      isPending={isPending}
      mode={mode}
      onClose={onClose}
      onConfirm={onConfirm}
      periodKey={periodKey}
      recipients={recipients}
    />
  )
}

function PayrollZaloPreviewModalBody({
  mode,
  codeLabel,
  periodKey,
  recipients,
  isPending,
  onClose,
  onConfirm,
}: Omit<PayrollZaloPreviewModalProps, 'isOpen'>) {
  const titleId = useId()
  const descId = useId()
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    recipients.map((r) => r.id),
  )
  const [activePreviewId, setActivePreviewId] = useState<string>(
    recipients[recipients.length - 1]?.id ?? recipients[0].id,
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPending, onClose])

  const previewTarget =
    recipients.find((r) => r.id === activePreviewId) ?? recipients[0]

  const toggleRecipient = (id: string) => {
    setActivePreviewId(id)
    if (mode === 'single') return
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  return (
    <div
      aria-describedby={descId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onClose()
        }
      }}
      role="dialog"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id={titleId}>
              {mode === 'single'
                ? 'Xem trước & Gửi lại phiếu lương'
                : 'Xem trước phiếu lương'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500" id={descId}>
              {mode === 'single'
                ? `${codeLabel} · Chỉ gửi lại cho nhân viên đang xem`
                : `${codeLabel} · Kiểm tra phiếu và người nhận trước khi gửi`}
            </p>
          </div>
          <button
            aria-label="Đóng xem trước phiếu lương"
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <h3 className="text-xs font-bold text-slate-800">
              Người nhận ({selectedIds.length})
            </h3>
            <div className="mt-2 space-y-2">
              {recipients.map((recipient) => {
                const isSelected = selectedIds.includes(recipient.id)
                const isActivePreview = previewTarget.id === recipient.id
                const statusDescription =
                  recipient.zaloStatus === 'failed'
                    ? `Lỗi gửi trước: ${recipient.zaloErrorReason ?? 'quá thời gian'}`
                    : recipient.zaloStatus === 'sent'
                      ? `Đã gửi lần trước lúc ${recipient.zaloSentAt ?? '03/10/2026, 09:35'}`
                      : 'Chưa gửi'

                return (
                  <button
                    className={cn(
                      'w-full rounded-xl border px-3.5 py-2.5 text-left transition-colors',
                      isActivePreview
                        ? 'border-indigo-300 bg-indigo-50/40'
                        : 'border-slate-200 bg-white hover:bg-slate-50',
                    )}
                    key={recipient.id}
                    onClick={() => toggleRecipient(recipient.id)}
                    type="button"
                  >
                    <p className="text-xs font-semibold text-slate-700">
                      {isSelected ? 'Đã chọn' : 'Bỏ chọn'} · {recipient.fullName}{' '}
                      · {recipient.employeeCode}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Đã liên kết Zalo · {statusDescription}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-800">
              NHÀ SÁCH MÂY · PHIẾU LƯƠNG {periodKey}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {previewTarget.fullName} · {previewTarget.employeeCode}
            </p>
            <dl className="mt-2 space-y-1 text-sm text-slate-700">
              {(
                [
                  ['Lương công', previewTarget.baseSalary],
                  ['OT', previewTarget.overtimeAmount],
                  ['Thưởng', previewTarget.bonus],
                  ['Phụ cấp', previewTarget.allowance],
                  ['Khấu trừ', previewTarget.deduction],
                  ['Trích nộp', previewTarget.mandatoryContribution],
                ] as const
              ).map(([label, amount]) => (
                <div className="flex items-center justify-between gap-4" key={label}>
                  <dt>{label}</dt>
                  <dd className="font-medium text-slate-900">
                    {formatVnd(amount)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 flex items-center justify-between gap-4 border-t border-slate-100 pt-2.5 text-sm font-bold text-slate-900">
              <span>THỰC LĨNH</span>
              <span className="text-indigo-700">
                {formatVnd(previewTarget.netPay)}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
            {mode === 'single'
              ? `Chỉ gửi lại phiếu cho ${previewTarget.fullName}. Lịch sử gửi được ghi nhận theo từng lần gửi.`
              : `Chỉ gửi cho ${selectedIds.length} nhân viên đã xác nhận. Kết quả Đã gửi / Lỗi gửi sẽ cập nhật tại từng dòng trong bảng.`}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              className="min-h-[44px]"
              disabled={isPending}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <Button
              className="min-h-[44px]"
              data-testid="hrm05-zalo-confirm-btn"
              disabled={isPending || selectedIds.length === 0}
              onClick={() => onConfirm(selectedIds)}
              type="button"
              variant="primary"
            >
              {isPending
                ? 'Đang gửi…'
                : mode === 'single'
                  ? 'Gửi lại 1 phiếu qua Zalo'
                  : `Gửi ${selectedIds.length} phiếu qua Zalo`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
