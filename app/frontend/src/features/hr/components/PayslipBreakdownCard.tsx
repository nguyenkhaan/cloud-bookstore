import { Card } from '@/components/common/Card'
import { cn } from '@/lib/cn'
import { formatVnd } from '../hr-payroll.mock'
import type { PayslipDetailDto } from '../hr-payroll.type'
import type { PayslipSourceDrawerType } from './PayslipSourceDrawer'

export interface PayslipBreakdownCardProps {
  payslip: PayslipDetailDto
  onOpenDrawer: (type: PayslipSourceDrawerType) => void
}

export function PayslipBreakdownCard({
  payslip,
  onOpenDrawer,
}: PayslipBreakdownCardProps) {
  const isPaid = payslip.payoutStatus === 'paid'

  return (
    <Card
      padding="lg"
      subtitle={`${payslip.payslipCode} · ${payslip.storeName}`}
      title={`Phiếu lương tháng ${payslip.periodKey}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            {payslip.employeeName}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {payslip.employeeCode} · {payslip.employeeRoleLabel}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Kỳ lương: {payslip.periodRange}
          </p>
        </div>

        <div className="sm:text-right">
          <span
            className={cn(
              'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
              isPaid
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700',
            )}
          >
            {isPaid
              ? `Đã thanh toán · ${payslip.payoutDate ?? '03/10/2026'}`
              : 'Đã duyệt · Chờ thanh toán'}
          </span>
          <p className="mt-2 text-xs text-slate-500">
            Duyệt bởi {payslip.approvedBy}
          </p>
          <p className="text-xs text-slate-500">{payslip.approvedAt}</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead>
            <tr className="bg-indigo-50/50 text-[11px] font-semibold text-slate-500">
              <th className="rounded-l-lg px-3 py-3">Khoản mục</th>
              <th className="px-3 py-3">Cách tính / Chứng từ</th>
              <th className="rounded-r-lg px-3 py-3 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 [&>tr:nth-child(even)]:bg-slate-50/60 [&>tr]:transition-colors [&>tr:hover]:bg-indigo-50/40">
            <tr>
              <td className="px-3 py-3.5 font-semibold text-slate-900">
                Lương công tiêu chuẩn
              </td>
              <td className="px-3 py-3.5">
                <button
                  className="font-medium text-indigo-600 hover:underline"
                  data-testid="hrm06-att-drawer-btn"
                  onClick={() => onOpenDrawer('attendance')}
                  type="button"
                >
                  {payslip.standardHours} giờ · Xem bảng công{' '}
                  {payslip.attendanceSourceCode}
                </button>
              </td>
              <td className="px-3 py-3.5 text-right font-semibold text-slate-900">
                {formatVnd(payslip.baseSalary)}
              </td>
            </tr>

            <tr>
              <td className="px-3 py-3.5 font-semibold text-slate-900">
                Lương làm thêm (OT)
              </td>
              <td className="px-3 py-3.5">
                <button
                  className="font-medium text-indigo-600 hover:underline"
                  data-testid="hrm06-ot-drawer-btn"
                  onClick={() => onOpenDrawer('overtime')}
                  type="button"
                >
                  {payslip.overtimeHours} giờ · Xem chi tiết OT
                </button>
              </td>
              <td className="px-3 py-3.5 text-right font-semibold text-slate-900">
                {formatVnd(payslip.overtimeAmount)}
              </td>
            </tr>

            <tr>
              <td className="px-3 py-3.5 font-semibold text-slate-900">
                Thưởng hiệu suất
              </td>
              <td className="px-3 py-3.5 text-slate-600">
                {payslip.bonusNote}
              </td>
              <td className="px-3 py-3.5 text-right font-semibold text-slate-900">
                {formatVnd(payslip.bonus)}
              </td>
            </tr>

            <tr>
              <td className="px-3 py-3.5 font-semibold text-slate-900">
                Phụ cấp
              </td>
              <td className="px-3 py-3.5 text-slate-600">
                {payslip.allowanceNote}
              </td>
              <td className="px-3 py-3.5 text-right font-semibold text-slate-900">
                {formatVnd(payslip.allowance)}
              </td>
            </tr>

            <tr>
              <td className="px-3 py-3.5 font-semibold text-slate-900">
                Trích nộp bắt buộc
              </td>
              <td className="px-3 py-3.5 text-slate-600">
                <p>BHXH / BHYT / BHTN: 0đ</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {payslip.mandatoryContributionNote}
                </p>
              </td>
              <td className="px-3 py-3.5 text-right font-semibold text-slate-900">
                {formatVnd(payslip.mandatoryContribution)}
              </td>
            </tr>

            <tr>
              <td className="px-3 py-3.5 font-semibold text-slate-900">
                Thuế TNCN
              </td>
              <td className="px-3 py-3.5 text-slate-600">{payslip.taxNote}</td>
              <td className="px-3 py-3.5 text-right font-semibold text-slate-900">
                {formatVnd(payslip.taxAmount)}
              </td>
            </tr>

            <tr>
              <td className="px-3 py-3.5 font-semibold text-slate-900">
                Khấu trừ nội bộ
              </td>
              <td className="px-3 py-3.5">
                <button
                  className="font-medium text-indigo-600 hover:underline"
                  data-testid="hrm06-adv-drawer-btn"
                  onClick={() => onOpenDrawer('advance')}
                  type="button"
                >
                  Tạm ứng {payslip.advanceVoucherCode} · Xem chứng từ
                </button>
              </td>
              <td className="px-3 py-3.5 text-right font-semibold text-slate-900">
                {payslip.deduction > 0
                  ? `-${formatVnd(payslip.deduction)}`
                  : '0đ'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-slate-100 px-3 pt-4 text-xs">
        <div className="flex items-center justify-end gap-6">
          <span className="text-slate-500">Tổng thu nhập</span>
          <span className="min-w-28 text-right font-bold text-slate-900">
            {formatVnd(payslip.totalIncome)}
          </span>
        </div>
        <div className="flex items-center justify-end gap-6">
          <span className="text-slate-500">Tổng khấu trừ</span>
          <span className="min-w-28 text-right font-bold text-slate-900">
            {payslip.totalDeduction > 0
              ? `−${formatVnd(payslip.totalDeduction)}`
              : '0đ'}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">
          LƯƠNG THỰC LĨNH
        </p>
        <p className="mt-1.5 text-3xl font-bold text-indigo-600">
          {formatVnd(payslip.netPay)}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Bằng chữ: {payslip.netPayInWords}
        </p>
      </div>

      <div
        className={cn(
          'mt-4 rounded-xl border px-4 py-3 text-xs font-medium',
          isPaid
            ? 'border-emerald-200/80 bg-emerald-50/80 text-emerald-700'
            : 'border-amber-200/80 bg-amber-50/80 text-amber-800',
        )}
      >
        {isPaid ? (
          <>
            <p>
              Đã chuyển khoản {formatVnd(payslip.netPay)} · {payslip.bankAccount}
            </p>
            <p className="mt-0.5">
              {payslip.payoutDate ?? '03/10/2026'} ·{' '}
              {payslip.transactionRef ?? 'BANK-PAY-20261003-001'}
            </p>
          </>
        ) : (
          <>
            <p>Đã duyệt · Chờ thanh toán</p>
            <p className="mt-0.5">
              Dự kiến chi trả ngày {payslip.expectedPayoutDate ?? '03/11/2026'}{' '}
              · {payslip.bankAccount}
            </p>
          </>
        )}
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        {isPaid
          ? `Nguồn ${payslip.attendanceSourceCode} · Bảng lương ${payslip.payrollCode} đã tất toán. Sai lệch sẽ được xem xét và bù trừ kỳ sau.`
          : `Nguồn ${payslip.attendanceSourceCode} · Phiếu đã được Admin duyệt. Thông tin chuyển khoản sẽ xuất hiện sau khi xác nhận chi trả.`}
      </p>
    </Card>
  )
}
