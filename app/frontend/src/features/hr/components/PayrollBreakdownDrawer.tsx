import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { formatVnd } from '../hr-payroll.utils'
import type {
  PayrollBreakdownData,
  PayrollBreakdownLine,
  PayrollCashVarianceItem,
  PayrollEmployeeRow,
} from '../hr-payroll.type'

export interface PayrollBreakdownDrawerProps {
  row: PayrollEmployeeRow | null
  payrollCode: string
  breakdown?: PayrollBreakdownData
  isLoadingBreakdown?: boolean
  onClose: () => void
  onOpenAdvanceVoucher?: (employeeId: string, line?: PayrollBreakdownLine) => void
}

export function PayrollBreakdownDrawer({
  row,
  payrollCode,
  breakdown,
  isLoadingBreakdown = false,
  onClose,
  onOpenAdvanceVoucher,
}: PayrollBreakdownDrawerProps) {
  if (!row) return null
  return (
    <PayrollBreakdownDrawerBody
      breakdown={breakdown}
      isLoadingBreakdown={isLoadingBreakdown}
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
  breakdown,
  isLoadingBreakdown,
  onClose,
  onOpenAdvanceVoucher,
}: {
  row: PayrollEmployeeRow
  payrollCode: string
  breakdown?: PayrollBreakdownData
  isLoadingBreakdown: boolean
  onClose: () => void
  onOpenAdvanceVoucher?: (employeeId: string, line?: PayrollBreakdownLine) => void
}) {
  const titleId = useId()
  const [view, setView] = useState<'breakdown' | 'cash_variance'>('breakdown')
  const [selectedVariance, setSelectedVariance] = useState<PayrollCashVarianceItem | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const bonusItems = breakdown?.bonusItems ?? row.bonusItems
  const allowanceItems = breakdown?.allowanceItems ?? row.allowanceItems
  const deductionItems = breakdown?.deductionItems ?? row.deductionItems
  const cashVariances = breakdown?.cashVariances ?? []

  const totalIncome =
    row.baseSalary + row.overtimeAmount + row.bonus + row.allowance
  const activeVariance = selectedVariance ?? cashVariances[0] ?? null
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
              {view === 'cash_variance' && (activeVariance || report)
                ? 'Biên bản đối soát lệch quỹ'
                : 'Chi tiết các khoản lương'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {view === 'cash_variance' && activeVariance
                ? `${activeVariance.voucherCode} · ${row.fullName} · ${row.employeeCode}`
                : view === 'cash_variance' && report
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
          {view === 'cash_variance' && activeVariance ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Mã ca két / chứng từ
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {activeVariance.voucherCode}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Thời gian mở - đóng ca
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {activeVariance.openedAt} - {activeVariance.closedAt ?? '-'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Dự kiến</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {activeVariance.expectedAmount != null
                      ? formatVnd(activeVariance.expectedAmount)
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Kiểm đếm</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {activeVariance.countedAmount != null
                      ? formatVnd(activeVariance.countedAmount)
                      : '-'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Chênh lệch</p>
                <p className="mt-1 text-sm font-bold text-rose-700">
                  {formatVnd(activeVariance.difference)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Ghi chú chênh lệch</p>
                <p className="mt-1 text-sm text-slate-700">
                  {activeVariance.varianceNote || 'Không có ghi chú.'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Người duyệt</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {activeVariance.approverName || 'Chưa duyệt'}
                </p>
              </div>
            </div>
          ) : view === 'cash_variance' && report ? (
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
                  {bonusItems.map((item, idx) => (
                    <p key={`${item.label}-${idx}`}>
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
                  {allowanceItems.map((item, idx) => (
                    <p key={`${item.label}-${idx}`}>
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
                  {deductionItems.length === 0 ? (
                    <p>Không phát sinh khấu trừ nội bộ.</p>
                  ) : (
                    deductionItems.map((item, idx) => (
                      <div className="space-y-1" key={`${item.label}-${idx}`}>
                        <p>
                          {item.label} · {formatVnd(item.amount)}
                        </p>
                        {item.voucherCode && (
                          <button
                            className="text-xs font-medium text-indigo-600 hover:underline"
                            onClick={() => onOpenAdvanceVoucher?.(row.id, item)}
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
                {isLoadingBreakdown && cashVariances.length === 0 ? (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Đang tải dữ liệu đối soát quỹ...
                  </p>
                ) : cashVariances.length > 0 ? (
                  <div className="mt-1.5 space-y-2">
                    {cashVariances.map((variance) => (
                      <div className="space-y-1" key={variance.cashSessionId}>
                        <p className="text-xs font-medium text-indigo-600">
                          {variance.voucherCode} · Chênh lệch {formatVnd(variance.difference)}
                        </p>
                        <button
                          className="text-xs font-medium text-indigo-600 hover:underline"
                          data-testid="hrm05-open-cash-variance-btn"
                          onClick={() => {
                            setSelectedVariance(variance)
                            setView('cash_variance')
                          }}
                          type="button"
                        >
                          Xem biên bản lệch quỹ và người duyệt
                        </button>
                      </div>
                    ))}
                  </div>
                ) : report ? (
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
