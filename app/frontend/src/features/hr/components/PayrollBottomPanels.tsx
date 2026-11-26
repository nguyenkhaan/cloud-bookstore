import { Link } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { SelectBox } from '@/components/common/SelectBox'
import { formatVnd } from '../hr-payroll.utils'
import type { PayrollPeriodSummary, PayoutMethod } from '../hr-payroll.type'
import { hrPaths } from '../hr.route'

export interface PayrollBottomPanelsProps {
  summary: PayrollPeriodSummary
  selectedIds: string[]
  payoutMethod: PayoutMethod
  transactionRefInput: string
  payoutDateInput: string
  onPayoutMethodChange: (method: PayoutMethod) => void
  onTransactionRefInputChange: (value: string) => void
  onPayoutDateInputChange: (value: string) => void
  onOpenBatchPayoutModal: () => void
  onSelectUnpaidEmployees: () => void
  onOpenUnlockModal: () => void
}

export function PayrollBottomPanels({
  summary,
  selectedIds,
  payoutMethod,
  transactionRefInput,
  payoutDateInput,
  onPayoutMethodChange,
  onTransactionRefInputChange,
  onPayoutDateInputChange,
  onOpenBatchPayoutModal,
  onSelectUnpaidEmployees,
  onOpenUnlockModal,
}: PayrollBottomPanelsProps) {
  const isDraft = summary.status === 'draft'
  const isApprovedUnpaid = summary.status === 'approved_unpaid'
  const isPartiallyPaid = summary.status === 'partially_paid'
  const isSettled = summary.status === 'settled'
  const hasAnyPayout = isPartiallyPaid || isSettled

  const selectedUnpaidRows = summary.rows.filter(
    (r) => selectedIds.includes(r.id) && r.payoutStatus === 'unpaid',
  )
  const selectedTotal = selectedUnpaidRows.reduce((sum, r) => sum + r.netPay, 0)
  const remainingUnpaidCount = summary.rows.filter(
    (r) => r.payoutStatus === 'unpaid' && !selectedIds.includes(r.id),
  ).length

  const selectedShortNames = selectedUnpaidRows
    .map((r) => r.fullName.split(' ').slice(-1)[0] || r.fullName)
    .join(' và ')

  const leftCardTitle = (() => {
    if (isSettled) return 'Chi trả lương · Đã đối chiếu'
    if (isDraft) return 'Chi trả lương · Chờ duyệt'
    if (isPartiallyPaid && selectedUnpaidRows.length === 0) {
      return `Lịch sử chi trả · Đã hoàn tất đợt ${summary.batches.length}`
    }
    return `Chi trả theo đợt · ${selectedUnpaidRows.length} nhân viên đã chọn`
  })()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card className="h-full" padding="lg" title={leftCardTitle}>
            {isSettled ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      Hình thức chi
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {summary.payoutMethod === 'cash'
                        ? 'Tiền mặt'
                        : 'Chuyển khoản ngân hàng'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      Mã giao dịch
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {summary.transactionRef ?? 'BANK-PAY-20261003-001'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      Ngày chi
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {summary.payoutDate ?? '03/10/2026'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Button
                    className="min-h-[44px]"
                    disabled
                    type="button"
                    variant="secondary"
                  >
                    Chi trả lương tiền mặt
                  </Button>
                  <Button
                    className="min-h-[44px]"
                    disabled
                    type="button"
                    variant="secondary"
                  >
                    Xác nhận chuyển khoản lương
                  </Button>
                </div>

                <p className="text-xs text-slate-500">
                  Đã trả {summary.paidRowsCount}/{summary.allRowsCount} nhân viên
                  · {formatVnd(summary.kpi.paidAmount)} ·{' '}
                  {summary.payoutConfirmedBy ?? 'Nguyễn Minh Anh'} xác nhận ngày{' '}
                  {summary.payoutDate ?? '03/10/2026'}.
                </p>
              </div>
            ) : isDraft ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      Hình thức chi
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      Chờ duyệt bảng lương
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      Mã giao dịch *
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Chưa có
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      Ngày chi *
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Chưa có
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Button
                    className="min-h-[44px]"
                    data-testid="hrm05-batch-payout-btn"
                    disabled
                    type="button"
                    variant="secondary"
                  >
                    Chi trả nhóm đã chọn
                  </Button>
                  <Button
                    className="min-h-[44px]"
                    disabled
                    type="button"
                    variant="secondary"
                  >
                    Chọn nhân viên chưa trả
                  </Button>
                </div>

                <p className="text-xs text-slate-500">
                  Chi trả chỉ được phép sau khi Admin duyệt.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SelectBox
                    label="Hình thức chi"
                    onChange={(val) =>
                      onPayoutMethodChange(val as PayoutMethod)
                    }
                    options={[
                      {
                        value: 'bank_transfer',
                        label: 'Chuyển khoản ngân hàng',
                      },
                      { value: 'cash', label: 'Tiền mặt' },
                    ]}
                    searchable={false}
                    value={payoutMethod}
                  />

                  <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                    <label
                      className="block text-xs font-semibold text-slate-600"
                      htmlFor="hrm05-panel-tx"
                    >
                      Mã giao dịch <span className="text-rose-600">*</span>
                    </label>
                    <input
                      className="mt-1 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      id="hrm05-panel-tx"
                      onChange={(event) =>
                        onTransactionRefInputChange(event.target.value)
                      }
                      placeholder="Nhập mã tham chiếu ngân hàng..."
                      type="text"
                      value={transactionRefInput}
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                    <label
                      className="block text-xs font-semibold text-slate-600"
                      htmlFor="hrm05-panel-date"
                    >
                      Ngày chi <span className="text-rose-600">*</span>
                    </label>
                    <input
                      className="mt-1 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      id="hrm05-panel-date"
                      onChange={(event) =>
                        onPayoutDateInputChange(event.target.value)
                      }
                      placeholder="Chọn ngày chi trả..."
                      type="text"
                      value={payoutDateInput}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Button
                    className="min-h-[44px]"
                    data-testid="hrm05-batch-payout-btn"
                    disabled={selectedUnpaidRows.length === 0}
                    onClick={onOpenBatchPayoutModal}
                    type="button"
                    variant="primary"
                  >
                    Chi trả nhóm đã chọn
                  </Button>
                  <Button
                    className="min-h-[44px]"
                    onClick={onSelectUnpaidEmployees}
                    type="button"
                    variant="secondary"
                  >
                    Chọn nhân viên chưa trả
                  </Button>
                </div>

                {selectedUnpaidRows.length > 0 && (
                  <p className="text-xs text-slate-600">
                    Đã chọn {selectedShortNames} · Tổng đợt:{' '}
                    {formatVnd(selectedTotal)} · {remainingUnpaidCount} nhân viên
                    còn lại chưa chọn.
                  </p>
                )}

                {summary.batches.map((batch) => (
                  <div
                    className="rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600"
                    key={batch.id}
                  >
                    <p className="font-semibold text-slate-800">
                      Đợt {batch.batchNumber} ·{' '}
                      {batch.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'} ·{' '}
                      {formatVnd(batch.amount)}
                    </p>
                    <p className="mt-0.5">
                      {batch.transactionRef} · {batch.payoutDate} ·{' '}
                      {batch.employeeNames.join(' và ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="h-full" padding="lg" title="Điều chỉnh có kiểm soát">
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-slate-600">
                {isSettled
                  ? 'Admin lập, điều chỉnh, duyệt và xác nhận chi trả. Bảng đã tất toán được giữ nguyên; sai sót được bù trừ ở kỳ sau.'
                  : isPartiallyPaid
                    ? 'Đã phát sinh khoản chi. Không thể mở khóa; sai sót phải được điều chỉnh vào kỳ sau.'
                    : isApprovedUnpaid
                      ? 'Admin có thể mở khóa kèm lý do khi chưa có bất kỳ khoản chi nào.'
                      : 'Admin đối chiếu, điều chỉnh và duyệt bảng lương. Chưa có chứng từ chi trả.'}
              </p>

              {hasAnyPayout ? (
                <Link
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition-colors hover:bg-slate-50"
                  data-testid="hrm05-next-adjust-btn"
                  to={`${hrPaths.payrollAdjustmentNew}?source=${summary.payrollCode}&period=${summary.periodKey}`}
                >
                  Lập điều chỉnh kỳ sau
                </Link>
              ) : (
                <Button
                  className="min-h-[44px]"
                  data-testid="hrm05-unlock-btn"
                  disabled={!isApprovedUnpaid}
                  onClick={onOpenUnlockModal}
                  type="button"
                  variant="secondary"
                >
                  Mở khóa bảng lương
                </Button>
              )}

              <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-800">
                {isSettled
                  ? `Bảng đã tất toán không được mở khóa. Dùng khoản điều chỉnh liên kết với kỳ ${summary.periodKey}.`
                  : isDraft
                    ? 'Bản nháp chưa được duyệt hoặc đưa vào chi trả.'
                    : 'Sau khi phát sinh khoản chi, sai sót được điều chỉnh sang kỳ sau.'}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {summary.history.length > 0 && (
        <Card padding="lg" title="Lịch sử chốt & Chi trả">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="bg-indigo-50/50 text-[11px] font-semibold text-slate-500">
                  <th className="rounded-l-lg px-3 py-3">Thời điểm</th>
                  <th className="px-3 py-3">Người thực hiện</th>
                  <th className="px-3 py-3">Sự kiện</th>
                  <th className="rounded-r-lg px-3 py-3">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {item.timestamp}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{item.actor}</td>
                    <td className="px-3 py-3 text-slate-700">{item.event}</td>
                    <td className="px-3 py-3 text-slate-700">{item.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
