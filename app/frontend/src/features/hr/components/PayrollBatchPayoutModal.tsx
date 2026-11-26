import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { notify } from '@/components/common/Toast'
import { cn } from '@/lib/cn'
import { useBatchPayoutMutation } from '../hr-payroll.hook'
import { formatVnd } from '../hr-payroll.utils'
import type { PayrollEmployeeRow, PayoutMethod } from '../hr-payroll.type'

export interface PayrollBatchPayoutModalProps {
  isOpen: boolean
  periodKey: string
  payrollCode: string
  selectedRows: PayrollEmployeeRow[]
  nextBatchNumber: number
  actorName: string
  initialMethod?: PayoutMethod
  initialTransactionRef?: string
  initialPayoutDate?: string
  onClose: () => void
  onSuccess?: () => void
}

export function PayrollBatchPayoutModal({
  isOpen,
  periodKey,
  payrollCode,
  selectedRows,
  nextBatchNumber,
  actorName,
  initialMethod = 'bank_transfer',
  initialTransactionRef,
  initialPayoutDate = '03/10/2026',
  onClose,
  onSuccess,
}: PayrollBatchPayoutModalProps) {
  if (!isOpen || selectedRows.length === 0) return null
  return (
    <PayrollBatchPayoutModalForm
      actorName={actorName}
      initialMethod={initialMethod}
      initialPayoutDate={initialPayoutDate}
      initialTransactionRef={initialTransactionRef}
      nextBatchNumber={nextBatchNumber}
      onClose={onClose}
      onSuccess={onSuccess}
      payrollCode={payrollCode}
      periodKey={periodKey}
      selectedRows={selectedRows}
    />
  )
}

function PayrollBatchPayoutModalForm({
  periodKey,
  payrollCode,
  selectedRows,
  nextBatchNumber,
  actorName,
  initialMethod,
  initialTransactionRef,
  initialPayoutDate,
  onClose,
  onSuccess,
}: Omit<PayrollBatchPayoutModalProps, 'isOpen'>) {
  const titleId = useId()
  const descId = useId()
  const txId = useId()
  const dateId = useId()
  const noteId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalAmount = selectedRows.reduce((sum, row) => sum + row.netPay, 0)
  const shortNames = selectedRows
    .map((r) => r.fullName.split(' ').slice(-1)[0] || r.fullName)
    .join(' và ')

  const [method, setMethod] = useState<PayoutMethod>(initialMethod ?? 'bank_transfer')
  const [transactionRef, setTransactionRef] = useState(
    initialTransactionRef?.trim() || `BANK-PAY-20261003-00${nextBatchNumber + 1}`,
  )
  const [payoutDate, setPayoutDate] = useState(initialPayoutDate || '03/10/2026')
  const [note, setNote] = useState(
    `Chi tiền mặt đợt ${nextBatchNumber} cho ${shortNames}.`,
  )
  const [attachmentName, setAttachmentName] = useState('')
  const [txError, setTxError] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)

  const payoutMutation = useBatchPayoutMutation()
  const cashVoucherCode = `PC-20261003-00${nextBatchNumber + 7}`

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !payoutMutation.isPending) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, payoutMutation.isPending])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const trimmedTx = transactionRef.trim()
    const trimmedDate = payoutDate.trim()
    const nextTxError =
      method === 'bank_transfer' && !trimmedTx
        ? 'Vui lòng nhập mã giao dịch ngân hàng.'
        : null
    const nextDateError = !trimmedDate ? 'Vui lòng nhập ngày chi trả.' : null

    setTxError(nextTxError)
    setDateError(nextDateError)
    if (nextTxError || nextDateError) return

    try {
      await payoutMutation.mutateAsync({
        periodKey,
        employeeIds: selectedRows.map((r) => r.id),
        method,
        transactionRef: method === 'bank_transfer' ? trimmedTx : cashVoucherCode,
        payoutDate: trimmedDate,
        note: method === 'cash' ? note.trim() : undefined,
        attachmentName: attachmentName || undefined,
        actorName,
      })
      notify.success(
        `Đã xác nhận chi ${formatVnd(totalAmount)} cho ${selectedRows.length} nhân viên.`,
      )
      onSuccess?.()
      onClose()
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Không thể xác nhận chi trả.',
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
        if (event.target === event.currentTarget && !payoutMutation.isPending) {
          onClose()
        }
      }}
      role="dialog"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id={titleId}>
              Chi trả lương theo đợt
            </h2>
            <p className="mt-0.5 text-xs text-slate-500" id={descId}>
              {payrollCode} · {selectedRows.length} nhân viên được chọn · Chưa
              thanh toán
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại chi trả"
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            disabled={payoutMutation.isPending}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" noValidate onSubmit={handleSubmit}>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs">
            <div className="space-y-1.5">
              {selectedRows.map((row) => (
                <div
                  className="flex items-center justify-between gap-2 text-slate-700"
                  key={row.id}
                >
                  <span className="truncate font-medium">
                    {row.fullName} · {row.employeeCode}
                  </span>
                  <span className="shrink-0 font-semibold text-slate-900">
                    {formatVnd(row.netPay)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/80 pt-2 text-xs font-bold text-indigo-700">
              <span>TỔNG ĐỢT CHI · {formatVnd(totalAmount)}</span>
            </div>
          </div>

          <div
            aria-label="Hình thức chi trả"
            className="grid grid-cols-2 gap-2.5"
            role="radiogroup"
          >
            <button
              aria-checked={method === 'bank_transfer'}
              className={cn(
                'flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors',
                method === 'bank_transfer'
                  ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
              data-testid="hrm05-payout-method-bank"
              onClick={() => setMethod('bank_transfer')}
              role="radio"
              type="button"
            >
              <span
                className={cn(
                  'inline-flex size-4 items-center justify-center rounded-full border',
                  method === 'bank_transfer'
                    ? 'border-indigo-600'
                    : 'border-slate-400',
                )}
              >
                {method === 'bank_transfer' && (
                  <span className="size-2 rounded-full bg-indigo-600" />
                )}
              </span>
              Chuyển khoản
            </button>

            <button
              aria-checked={method === 'cash'}
              className={cn(
                'flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors',
                method === 'cash'
                  ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
              data-testid="hrm05-payout-method-cash"
              onClick={() => setMethod('cash')}
              role="radio"
              type="button"
            >
              <span
                className={cn(
                  'inline-flex size-4 items-center justify-center rounded-full border',
                  method === 'cash' ? 'border-indigo-600' : 'border-slate-400',
                )}
              >
                {method === 'cash' && (
                  <span className="size-2 rounded-full bg-indigo-600" />
                )}
              </span>
              Tiền mặt
            </button>
          </div>

          {method === 'bank_transfer' ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                <label
                  className="block text-[11px] font-semibold text-slate-600"
                  htmlFor={txId}
                >
                  Mã giao dịch ngân hàng <span className="text-rose-600">*</span>
                </label>
                <input
                  aria-invalid={txError ? true : undefined}
                  className="mt-1 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  data-testid="hrm05-payout-tx-input"
                  id={txId}
                  onChange={(event) => {
                    setTransactionRef(event.target.value)
                    if (txError) setTxError(null)
                  }}
                  placeholder="Nhập mã giao dịch ngân hàng..."
                  type="text"
                  value={transactionRef}
                />
                {txError && (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {txError}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                <label
                  className="block text-[11px] font-semibold text-slate-600"
                  htmlFor={dateId}
                >
                  Ngày chi trả <span className="text-rose-600">*</span>
                </label>
                <input
                  aria-invalid={dateError ? true : undefined}
                  className="mt-1 w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                  id={dateId}
                  onChange={(event) => {
                    setPayoutDate(event.target.value)
                    if (dateError) setDateError(null)
                  }}
                  type="text"
                  value={payoutDate}
                />
                {dateError && (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {dateError}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                <span className="block text-[11px] font-semibold text-slate-600">
                  Minh chứng chuyển khoản
                </span>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <button
                    className="inline-flex min-h-[36px] items-center gap-2 text-sm text-slate-700 hover:text-indigo-700"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Upload aria-hidden="true" className="size-4 text-slate-500" />
                    <span>
                      {attachmentName || 'Chọn chứng từ / ảnh biên nhận'}
                    </span>
                  </button>
                  <input
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      setAttachmentName(file ? file.name : '')
                    }}
                    ref={fileInputRef}
                    type="file"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                Chuyển khoản được thực hiện ngoài hệ thống. Xác nhận này ghi nhận
                chứng từ cho đúng {selectedRows.length} nhân viên đã chọn.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                <label
                  className="block text-[11px] font-semibold text-slate-600"
                  htmlFor={dateId}
                >
                  Ngày chi trả <span className="text-rose-600">*</span>
                </label>
                <input
                  aria-invalid={dateError ? true : undefined}
                  className="mt-1 w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                  id={dateId}
                  onChange={(event) => {
                    setPayoutDate(event.target.value)
                    if (dateError) setDateError(null)
                  }}
                  type="text"
                  value={payoutDate}
                />
                {dateError && (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {dateError}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                <span className="block text-[11px] font-semibold text-slate-600">
                  Mã phiếu chi
                </span>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {cashVoucherCode} · Tạo khi xác nhận
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                <label
                  className="block text-[11px] font-semibold text-slate-600"
                  htmlFor={noteId}
                >
                  Ghi chú
                </label>
                <input
                  className="mt-1 w-full bg-transparent text-sm text-slate-900 outline-none"
                  id={noteId}
                  onChange={(event) => setNote(event.target.value)}
                  type="text"
                  value={note}
                />
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                Tiền mặt được ghi nhận vào ca két đang mở. Tổng phiếu chi:{' '}
                {formatVnd(totalAmount)}.
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              className="min-h-[44px]"
              disabled={payoutMutation.isPending}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <Button
              className="min-h-[44px]"
              data-testid="hrm05-payout-confirm-btn"
              disabled={payoutMutation.isPending}
              type="submit"
              variant="primary"
            >
              {payoutMutation.isPending
                ? 'Đang ghi nhận…'
                : `Xác nhận chi ${formatVnd(totalAmount)}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
