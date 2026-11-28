import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { SearchIcon } from '@/components/common/Icons'
import { SelectBox } from '@/components/common/SelectBox'
import { cn } from '@/lib/cn'
import {
  PAYOUT_FILTER_OPTIONS,
  PAYROLL_PERIOD_OPTIONS,
  PAYROLL_STATUS_FILTER_OPTIONS,
  ZALO_STATUS_LABELS,
  formatVnd,
} from '../hr-payroll.utils'
import type {
  EmployeePayoutStatus,
  PayrollEmployeeRow,
  PayrollPeriodStatus,
  PayrollPeriodSummary,
} from '../hr-payroll.type'

export interface PayrollTableSectionProps {
  summary: PayrollPeriodSummary
  periodKey: string
  periodOptions?: { value: string; label: string }[]
  search: string
  statusFilter: PayrollPeriodStatus | ''
  payoutFilter: EmployeePayoutStatus | 'partial' | ''
  page: number
  selectedIds: string[]
  isInitializing: boolean
  isApproving: boolean
  onPeriodChange: (nextPeriod: string) => void
  onSearchChange: (nextSearch: string) => void
  onStatusFilterChange: (nextStatus: PayrollPeriodStatus | '') => void
  onPayoutFilterChange: (nextPayout: EmployeePayoutStatus | 'partial' | '') => void
  onPageChange: (nextPage: number) => void
  onToggleSelectRow: (employeeId: string) => void
  onToggleSelectAllUnpaid: () => void
  onOpenBreakdown: (row: PayrollEmployeeRow) => void
  onInitializeFromAttendance: () => void
  onOpenManualAdjust: () => void
  onApprovePayroll: () => void
}

const PAGE_SIZE = 10

export function PayrollTableSection({
  summary,
  periodKey,
  periodOptions,
  search,
  statusFilter,
  payoutFilter,
  page,
  selectedIds,
  isInitializing,
  isApproving,
  onPeriodChange,
  onSearchChange,
  onStatusFilterChange,
  onPayoutFilterChange,
  onPageChange,
  onToggleSelectRow,
  onToggleSelectAllUnpaid,
  onOpenBreakdown,
  onInitializeFromAttendance,
  onOpenManualAdjust,
  onApprovePayroll,
}: PayrollTableSectionProps) {
  const isDraft = summary.status === 'draft'
  const canSelectForPayout =
    summary.status === 'approved_unpaid' || summary.status === 'partially_paid'

  const rows = summary.rows
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visibleRows = rows.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )
  const startRow = rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const endRow = Math.min(safePage * PAGE_SIZE, rows.length)

  const unpaidVisibleIds = visibleRows
    .filter((r) => r.payoutStatus === 'unpaid')
    .map((r) => r.id)
  const allUnpaidChecked =
    unpaidVisibleIds.length > 0 &&
    unpaidVisibleIds.every((id) => selectedIds.includes(id))

  const statusBannerText = (() => {
    if (summary.status === 'draft') {
      return 'Bản nháp: đối chiếu giờ công và các khoản mục trước khi Admin duyệt. Chưa được chi trả.'
    }
    if (summary.status === 'approved_unpaid') {
      return 'Đã duyệt, chưa chi trả. Chọn nhân viên để lập một đợt thanh toán.'
    }
    if (summary.status === 'partially_paid') {
      const paidBatch = summary.batches[summary.batches.length - 1]
      const paidShort = paidBatch?.employeeNames.join(' và ') ?? ''
      const remainingCount = summary.allRowsCount - summary.paidRowsCount
      return `Đã ghi nhận đợt chi ${formatVnd(summary.kpi.paidAmount)} cho ${paidShort}. ${remainingCount} nhân viên còn lại chưa được chi trả.`
    }
    return `Đã tất toán ${summary.paidRowsCount}/${summary.allRowsCount} nhân viên. Chứng từ đã đối chiếu; không thể sửa hoặc thanh toán lần hai. Trích nộp 0đ cần kiểm tra hồ sơ.`
  })()

  return (
    <Card
      padding="lg"
      subtitle="Thực lĩnh = Lương công + OT + Thưởng + Phụ cấp - Khấu trừ nội bộ - Trích nộp."
      title={`Bảng lương tháng ${periodKey}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 min-w-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
            <SearchIcon size={16} />
          </div>
          <input
            aria-label="Tìm nhân viên hoặc mã nhân viên"
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-indigo-50/40 py-2.5 pr-4 pl-10 text-xs text-slate-800 placeholder:text-slate-500 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm nhân viên / mã NV…"
            type="text"
            value={search}
          />
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:flex lg:items-center">
          <div className="w-full lg:w-40">
            <SelectBox
              hideLabel
              label="Kỳ lương"
              onChange={onPeriodChange}
              options={
                periodOptions && periodOptions.length > 0
                  ? periodOptions
                  : periodKey
                    ? [{ value: periodKey, label: periodKey }]
                    : PAYROLL_PERIOD_OPTIONS
              }
              searchable={false}
              testId="hrm05-period-select"
              value={periodKey}
            />
          </div>

          <div className="w-full lg:w-44">
            <SelectBox
              hideLabel
              label="Trạng thái bảng lương"
              onChange={(val) =>
                onStatusFilterChange(val as PayrollPeriodStatus | '')
              }
              options={PAYROLL_STATUS_FILTER_OPTIONS}
              searchable={false}
              value={statusFilter}
            />
          </div>

          <div className="w-full lg:w-44">
            <SelectBox
              hideLabel
              label="Trạng thái chi trả"
              onChange={(val) =>
                onPayoutFilterChange(val as EmployeePayoutStatus | 'partial' | '')
              }
              options={PAYOUT_FILTER_OPTIONS}
              searchable={false}
              value={payoutFilter}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-xs">
          <thead>
            <tr className="bg-indigo-50/50 text-[11px] font-semibold text-slate-500">
              <th className="rounded-l-lg px-3 py-3">
                <input
                  aria-label="Chọn tất cả nhân viên chưa thanh toán"
                  checked={allUnpaidChecked}
                  className="size-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canSelectForPayout || unpaidVisibleIds.length === 0}
                  onChange={onToggleSelectAllUnpaid}
                  type="checkbox"
                />
              </th>
              <th className="px-3 py-3">Nhân viên / Vai trò</th>
              <th className="px-3 py-3">Giờ × Đơn giá</th>
              <th className="px-3 py-3">Lương công</th>
              <th className="px-3 py-3">Tiền OT / Công thức</th>
              <th className="px-3 py-3">Thưởng</th>
              <th className="px-3 py-3">Phụ cấp</th>
              <th className="px-3 py-3">Khấu trừ</th>
              <th className="px-3 py-3">Trích nộp</th>
              <th className="px-3 py-3">Thực lĩnh</th>
              <th className="px-3 py-3">Chi trả</th>
              <th className="rounded-r-lg px-3 py-3">Gửi phiếu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  className="py-10 text-center text-xs text-slate-500"
                  colSpan={12}
                >
                  Không có dòng bảng lương phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const isChecked = selectedIds.includes(row.id)
                const isRowSelectable =
                  canSelectForPayout && row.payoutStatus === 'unpaid'

                return (
                  <tr
                    className="transition-colors hover:bg-slate-50/70"
                    key={row.id}
                  >
                    <td className="px-3 py-3.5 align-middle">
                      <input
                        aria-label={`Chọn ${row.fullName}`}
                        checked={isChecked}
                        className="size-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!isRowSelectable}
                        onChange={() => onToggleSelectRow(row.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-3.5 align-middle">
                      <p className="font-semibold text-slate-900">
                        {row.employeeCode} · {row.fullName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {row.roleLabel}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap text-slate-700">
                      {row.standardHours} × {formatVnd(row.hourlyRate)}
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap font-medium text-slate-900">
                      {formatVnd(row.baseSalary)}
                    </td>
                    <td className="px-3 py-3.5 align-middle">
                      <p className="font-medium text-slate-900">
                        {formatVnd(row.overtimeAmount)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {row.overtimeFormula}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                      <button
                        className="font-medium text-emerald-700 hover:underline"
                        onClick={() => onOpenBreakdown(row)}
                        type="button"
                      >
                        {formatVnd(row.bonus)}
                      </button>
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                      <button
                        className="font-medium text-emerald-700 hover:underline"
                        onClick={() => onOpenBreakdown(row)}
                        type="button"
                      >
                        {formatVnd(row.allowance)}
                      </button>
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                      <button
                        className="font-medium text-rose-700 hover:underline"
                        onClick={() => onOpenBreakdown(row)}
                        type="button"
                      >
                        {formatVnd(row.deduction)}
                      </button>
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                      <button
                        className="font-medium text-rose-700 hover:underline"
                        onClick={() => onOpenBreakdown(row)}
                        type="button"
                      >
                        {formatVnd(row.mandatoryContribution)}
                      </button>
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap font-bold text-slate-900">
                      {formatVnd(row.netPay)}
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                      <span
                        className={cn(
                          'text-xs font-medium',
                          row.payoutStatus === 'paid'
                            ? 'text-emerald-600'
                            : 'text-amber-700',
                        )}
                      >
                        {row.payoutStatus === 'paid'
                          ? 'Đã thanh toán'
                          : 'Chưa thanh toán'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          row.zaloStatus === 'sent'
                            ? 'bg-emerald-50 text-emerald-700'
                            : row.zaloStatus === 'failed'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {ZALO_STATUS_LABELS[row.zaloStatus]}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Hiển thị {startRow}-{endRow} trong {rows.length} nhân viên
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
            10 / trang
          </span>
          <Button
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Trước
          </Button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (pageNum) => (
              <Button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                size="sm"
                type="button"
                variant={pageNum === safePage ? 'primary' : 'secondary'}
              >
                {pageNum}
              </Button>
            ),
          )}
          <Button
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Sau
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          TỔNG THỰC LĨNH · {summary.allRowsCount} nhân viên
        </span>
        <span className="text-2xl font-bold text-indigo-600">
          {formatVnd(summary.kpi.totalNetPay)}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-xs font-medium text-emerald-700">
        {statusBannerText}
      </div>

      {isDraft && (summary.pendingAdjustments?.length ?? 0) > 0 && (
        <div
          className="mt-4 rounded-xl border border-indigo-200/80 bg-indigo-50/50 px-4 py-3 text-xs"
          data-testid="hrm05-pending-adjustments"
        >
          <p className="font-semibold text-indigo-900">
            Khoản điều chỉnh kỳ sau chờ áp dụng ({summary.pendingAdjustments?.length ?? 0})
          </p>
          <p className="mt-0.5 text-indigo-700">
            Các khoản trạng thái Đã duyệt sẽ tự động áp dụng khi bấm &quot;Khởi tạo bảng lương từ bảng công&quot;.
          </p>
          <div className="mt-2.5 space-y-1.5">
            {summary.pendingAdjustments?.map((adj) => {
              const isAddition = adj.adjustmentType === 'add_next_period'
              return (
                <div
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-2"
                  key={adj.id}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {adj.id} · {adj.employeeLabel}
                    </p>
                    <p className="text-slate-600">
                      {adj.category} · {adj.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-bold',
                        isAddition ? 'text-emerald-700' : 'text-rose-700',
                      )}
                    >
                      {isAddition ? '+' : '-'}{formatVnd(adj.amount)}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        adj.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-800',
                      )}
                    >
                      {adj.status === 'approved' ? 'Đã duyệt' : 'Bản nháp'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button
          className="min-h-[44px]"
          disabled={!isDraft || isInitializing}
          onClick={onInitializeFromAttendance}
          type="button"
          variant="secondary"
        >
          {isInitializing ? 'Đang khởi tạo…' : 'Khởi tạo bảng lương từ bảng công'}
        </Button>
        <Button
          className="min-h-[44px]"
          disabled={!isDraft}
          onClick={onOpenManualAdjust}
          type="button"
          variant="secondary"
        >
          Điều chỉnh thủ công
        </Button>
        <Button
          className="min-h-[44px]"
          data-testid="hrm05-approve-btn"
          disabled={!isDraft || isApproving}
          onClick={onApprovePayroll}
          type="button"
          variant={isDraft ? 'primary' : 'secondary'}
        >
          {isApproving ? 'Đang duyệt…' : 'Duyệt & Chốt bảng lương'}
        </Button>
      </div>
    </Card>
  )
}
