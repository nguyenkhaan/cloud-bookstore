import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { formatVnd } from '../hr-payroll.mock'
import type { PayrollEmployeeRow } from '../hr-payroll.type'

export interface PayrollBreakdownDrawerProps {
  row: PayrollEmployeeRow | null
  payrollCode: string
  onClose: () => void
  onOpenAdvanceVoucher?: (employeeId: string) => void
}

export function PayrollBreakdownDrawer({
  row,
  payrollCode,
  onClose,
  onOpenAdvanceVoucher,
}: PayrollBreakdownDrawerProps) {
  if (!row) return null
  return (
    <PayrollBreakdownDrawerBody
      key={row.id}
      onClose={onClose}
      onOpenAdvanceVoucher={onOpenAdvanceVoucher}
      payrollCode={payrollCode}
      row={row}
    />
  )
}

function PayrollBreakdownDrawerBody({
  row,
  payrollCode,
  onClose,
  onOpenAdvanceVoucher,
}: {
  row: PayrollEmployeeRow
  payrollCode: string
  onClose: () => void
  onOpenAdvanceVoucher?: (employeeId: string) => void
}) {
  const titleId = useId()
  const [view, setView] = useState<'breakdown' | 'cash_variance'>('breakdown')

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const totalIncome =
    row.baseSalary + row.overtimeAmount + row.bonus + row.allowance
  const report = row.cashVarianceReport

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id={titleId}>
              {view === 'cash_variance' && report
                ? 'Biên bản đối soát lệch quỹ'
                : 'Chi tiết các khoản lương'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {view === 'cash_variance' && report
                ? `${report.voucherCode} · ${report.shiftLabel}`
                : `${row.fullName} · ${row.employeeCode} · ${payrollCode}`}
            </p>
          </div>
          <button
            aria-label="Đóng ngăn chi tiết"
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm">
          {view === 'cash_variance' && report ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Kết quả đối soát
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {report.reconciliationResult}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Nhân viên phụ trách
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {report.employeeLabel}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Số tiền chênh lệch ban đầu
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {report.initialDifference}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Nguyên nhân đã xác minh
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {report.verifiedCause}
                </p>
                <p className="mt-0.5 text-sm text-slate-700">
                  {report.resolutionNote}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Người phê duyệt
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {report.approverName} · {report.approverRole}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {report.approvedAt}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Ảnh hưởng tới bảng lương
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {report.payrollImpact}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {report.internalDeductionNote}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Thưởng · {formatVnd(row.bonus)}
                </h3>
                <div className="mt-1.5 space-y-1 text-xs text-slate-600">
                  {row.bonusItems.map((item) => (
                    <p key={item.label}>
                      {item.label} · {formatVnd(item.amount)}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Phụ cấp · {formatVnd(row.allowance)}
                </h3>
                <div className="mt-1.5 space-y-1 text-xs text-slate-600">
                  {row.allowanceItems.map((item) => (
                    <p key={item.label}>
                      {item.label}: {formatVnd(item.amount)}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Khấu trừ nội bộ · {formatVnd(row.deduction)}
                </h3>
                <div className="mt-1.5 space-y-1 text-xs text-slate-600">
                  {row.deductionItems.length === 0 ? (
                    <p>Không phát sinh khấu trừ nội bộ.</p>
                  ) : (
                    row.deductionItems.map((item) => (
                      <div className="space-y-1" key={item.label}>
                        <p>
                          {item.label} · {formatVnd(item.amount)}
                        </p>
                        {item.voucherCode && (
                          <button
                            className="text-xs font-medium text-indigo-600 hover:underline"
                            onClick={() => onOpenAdvanceVoucher?.(row.id)}
                            type="button"
                          >
                            Xem chứng từ tạm ứng {item.voucherCode}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Trích nộp · {formatVnd(row.mandatoryContribution)}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600">
                  {row.contributionNote}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Chứng từ quỹ liên quan
                </h3>
                {report ? (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-xs font-medium text-indigo-600">
                      {report.voucherCode} · {report.reconciliationResult}
                    </p>
                    <button
                      className="text-xs font-medium text-indigo-600 hover:underline"
                      data-testid="hrm05-open-cash-variance-btn"
                      onClick={() => setView('cash_variance')}
                      type="button"
                    >
                      Xem biên bản lệch quỹ và người duyệt
                    </button>
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-600">
                    Không phát sinh chênh lệch quỹ trong kỳ.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-700">
                Tổng thu nhập {formatVnd(totalIncome)} - Khấu trừ{' '}
                {formatVnd(row.deduction)} - Trích nộp{' '}
                {formatVnd(row.mandatoryContribution)} = Thực lĩnh{' '}
                {formatVnd(row.netPay)}.
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4">
          <Button
            className="min-h-[44px]"
            onClick={() => {
              if (view === 'cash_variance') {
                setView('breakdown')
                return
              }
              onClose()
            }}
            type="button"
            variant="outline"
          >
            Quay lại
          </Button>
          <Button
            className="min-h-[44px]"
            onClick={onClose}
            type="button"
            variant="primary"
          >
            Đóng chi tiết
          </Button>
        </div>
      </div>
    </div>
  )
}
