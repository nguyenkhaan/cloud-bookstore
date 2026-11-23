import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { SelectBox } from '@/components/common/SelectBox'
import { notify } from '@/components/common/Toast'
import { useAdjustDraftPayrollMutation } from '../hr-payroll.hook'
import type { PayrollEmployeeRow } from '../hr-payroll.type'

export interface PayrollManualAdjustModalProps {
  isOpen: boolean
  periodKey: string
  payrollCode: string
  rows: PayrollEmployeeRow[]
  actorName: string
  onClose: () => void
}

export function PayrollManualAdjustModal({
  isOpen,
  periodKey,
  payrollCode,
  rows,
  actorName,
  onClose,
}: PayrollManualAdjustModalProps) {
  if (!isOpen || rows.length === 0) return null
  return (
    <PayrollManualAdjustModalForm
      actorName={actorName}
      onClose={onClose}
      payrollCode={payrollCode}
      periodKey={periodKey}
      rows={rows}
    />
  )
}

function PayrollManualAdjustModalForm({
  periodKey,
  payrollCode,
  rows,
  actorName,
  onClose,
}: Omit<PayrollManualAdjustModalProps, 'isOpen'>) {
  const titleId = useId()
  const bonusId = useId()
  const allowanceId = useId()
  const deductionId = useId()
  const noteId = useId()

  const [employeeId, setEmployeeId] = useState(rows[0].id)
  const currentRow = rows.find((r) => r.id === employeeId) ?? rows[0]

  const [bonus, setBonus] = useState(String(currentRow.bonus))
  const [allowance, setAllowance] = useState(String(currentRow.allowance))
  const [deduction, setDeduction] = useState(String(currentRow.deduction))
  const [note, setNote] = useState('')

  const adjustMutation = useAdjustDraftPayrollMutation()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !adjustMutation.isPending) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [adjustMutation.isPending, onClose])

  const handleEmployeeChange = (nextId: string) => {
    setEmployeeId(nextId)
    const found = rows.find((r) => r.id === nextId)
    if (found) {
      setBonus(String(found.bonus))
      setAllowance(String(found.allowance))
      setDeduction(String(found.deduction))
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await adjustMutation.mutateAsync({
        input: {
          periodKey,
          employeeId,
          bonus: Number(bonus) || 0,
          allowance: Number(allowance) || 0,
          deduction: Number(deduction) || 0,
          note: note.trim() || undefined,
        },
        actorName,
      })
      notify.success(`Đã cập nhật điều chỉnh thủ công cho ${currentRow.fullName}.`)
      onClose()
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Không thể lưu điều chỉnh.',
      )
    }
  }

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !adjustMutation.isPending) {
          onClose()
        }
      }}
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id={titleId}>
              Điều chỉnh thủ công bản nháp
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {payrollCode} · Chỉ áp dụng trước khi Admin duyệt &amp; khóa
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại điều chỉnh"
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <SelectBox
            label="Nhân viên"
            onChange={handleEmployeeChange}
            options={rows.map((r) => ({
              value: r.id,
              label: `${r.fullName} · ${r.employeeCode}`,
            }))}
            searchable={false}
            value={employeeId}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <label
                className="block text-[11px] font-semibold text-slate-600"
                htmlFor={bonusId}
              >
                Thưởng (đ)
              </label>
              <input
                className="mt-1 w-full text-sm font-medium text-slate-900 outline-none"
                id={bonusId}
                min={0}
                onChange={(event) => setBonus(event.target.value)}
                type="number"
                value={bonus}
              />
            </div>

            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <label
                className="block text-[11px] font-semibold text-slate-600"
                htmlFor={allowanceId}
              >
                Phụ cấp (đ)
              </label>
              <input
                className="mt-1 w-full text-sm font-medium text-slate-900 outline-none"
                id={allowanceId}
                min={0}
                onChange={(event) => setAllowance(event.target.value)}
                type="number"
                value={allowance}
              />
            </div>

            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <label
                className="block text-[11px] font-semibold text-slate-600"
                htmlFor={deductionId}
              >
                Khấu trừ (đ)
              </label>
              <input
                className="mt-1 w-full text-sm font-medium text-slate-900 outline-none"
                id={deductionId}
                min={0}
                onChange={(event) => setDeduction(event.target.value)}
                type="number"
                value={deduction}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 px-3.5 py-2.5">
            <label
              className="block text-[11px] font-semibold text-slate-600"
              htmlFor={noteId}
            >
              Ghi chú điều chỉnh
            </label>
            <input
              className="mt-1 w-full text-sm text-slate-900 outline-none placeholder:text-slate-400"
              id={noteId}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ví dụ: Bổ sung thưởng doanh số tuần cuối..."
              type="text"
              value={note}
            />
          </div>

          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              className="min-h-[44px]"
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <Button
              className="min-h-[44px]"
              disabled={adjustMutation.isPending}
              type="submit"
              variant="primary"
            >
              {adjustMutation.isPending ? 'Đang lưu…' : 'Lưu điều chỉnh'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
