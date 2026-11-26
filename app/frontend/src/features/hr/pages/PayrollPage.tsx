import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { StatCard } from '@/components/common/StatCard'
import { notify } from '@/components/common/Toast'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { PayrollBatchPayoutModal } from '../components/PayrollBatchPayoutModal'
import { PayrollBottomPanels } from '../components/PayrollBottomPanels'
import { PayrollBreakdownDrawer } from '../components/PayrollBreakdownDrawer'
import { PayrollManualAdjustModal } from '../components/PayrollManualAdjustModal'
import { PayrollTableSection } from '../components/PayrollTableSection'
import { PayrollUnlockModal } from '../components/PayrollUnlockModal'
import { PayrollZaloPreviewModal } from '../components/PayrollZaloPreviewModal'
import { PayslipSourceDrawer } from '../components/PayslipSourceDrawer'
import {
  useApprovePayrollMutation,
  useHrPayrollPeriodQuery,
  useHrPayrollPeriodsListQuery,
  useInitializePayrollMutation,
  usePayrollBreakdownQuery,
  useSendPayrollZaloMutation,
} from '../hr-payroll.hook'
import { formatVnd, getTodayVietnamIsoDate } from '../hr-payroll.utils'
import type {
  EmployeePayoutStatus,
  PayrollBreakdownLine,
  PayrollEmployeeRow,
  PayrollPeriodStatus,
  PayoutMethod,
  PayslipAdvanceVoucher,
} from '../hr-payroll.type'
import {
  formatHrRoleLabel,
  isHrAdmin,
  resolveHrRoleCode,
} from '../hr-role.util'
import { hrPaths } from '../hr.route'

export default function PayrollPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, signOut } = useAuth()

  const currentUser = session?.user
  const effectiveRoleCode = resolveHrRoleCode(currentUser)
  const isAdmin = isHrAdmin(effectiveRoleCode)
  const effectiveRoleLabel = formatHrRoleLabel(effectiveRoleCode)

  const [periodKey, setPeriodKey] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PayrollPeriodStatus | ''>('')
  const [payoutFilter, setPayoutFilter] = useState<
    EmployeePayoutStatus | 'partial' | ''
  >('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('bank_transfer')
  const [transactionRefInput, setTransactionRefInput] = useState('')
  const [payoutDateInput, setPayoutDateInput] = useState(() =>
    getTodayVietnamIsoDate(),
  )

  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [isBatchPayoutOpen, setIsBatchPayoutOpen] = useState(false)
  const [isZaloOpen, setIsZaloOpen] = useState(false)
  const [isManualAdjustOpen, setIsManualAdjustOpen] = useState(false)
  const [drawerRow, setDrawerRow] = useState<PayrollEmployeeRow | null>(null)
  const [advanceDrawerState, setAdvanceDrawerState] = useState<{
    row: PayrollEmployeeRow
    voucher: PayslipAdvanceVoucher
  } | null>(null)

  const periodsQuery = useHrPayrollPeriodsListQuery(isAdmin)
  const periodOptions = (periodsQuery.data ?? []).map((item) => ({
    value: item.periodKey,
    label: item.periodKey,
  }))
  const activePeriodKey = periodKey || periodsQuery.data?.[0]?.periodKey || ''

  const periodQuery = useHrPayrollPeriodQuery(
    {
      periodKey: activePeriodKey,
      search,
      statusFilter,
      payoutFilter,
    },
    isAdmin && Boolean(activePeriodKey),
  )
  const summary = periodQuery.data
  const breakdownQuery = usePayrollBreakdownQuery(
    summary?.periodKey ?? '',
    drawerRow?.id ?? '',
    Boolean(isAdmin && summary?.periodKey && drawerRow?.id),
  )

  const initializeMutation = useInitializePayrollMutation()
  const approveMutation = useApprovePayrollMutation()
  const sendZaloMutation = useSendPayrollZaloMutation()

  if (!currentUser) return null

  const navigateFromSidebar = (id: string) => {
    const targetPath = workspacePathFor(id)
    if (targetPath) navigate(targetPath)
  }

  const handlePeriodChange = (nextPeriod: string) => {
    setPeriodKey(nextPeriod)
    setStatusFilter('')
    setPayoutFilter('')
    setPage(1)
    setSelectedIds([])
  }

  const handleExportCsv = () => {
    if (!summary) return
    const header = [
      'Mã NV',
      'Họ tên',
      'Vai trò',
      'Giờ chuẩn',
      'Đơn giá',
      'Lương công',
      'Tiền OT',
      'Thưởng',
      'Phụ cấp',
      'Khấu trừ',
      'Trích nộp',
      'Thực lĩnh',
      'Chi trả',
      'Gửi phiếu Zalo',
    ].join(',')
    const lines = summary.rows.map((r) =>
      [
        r.employeeCode,
        `"${r.fullName}"`,
        `"${r.roleLabel}"`,
        r.standardHours,
        r.hourlyRate,
        r.baseSalary,
        r.overtimeAmount,
        r.bonus,
        r.allowance,
        r.deduction,
        r.mandatoryContribution,
        r.netPay,
        r.payoutStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán',
        r.zaloStatus,
      ].join(','),
    )
    const csv = `\uFEFF${[header, ...lines].join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${summary.payrollCode}.csv`
    link.click()
    URL.revokeObjectURL(url)
    notify.success(`Đã xuất bảng lương ${summary.payrollCode}.`)
  }

  if (!isAdmin) {
    return (
      <MainLayout
        breadcrumbs={[
          { label: 'Không gian làm việc' },
          { label: 'Nhân sự & tiền lương', to: '/hr' },
          { label: 'Bảng thanh toán lương' },
        ]}
        currentPath="hr"
        onNavigate={navigateFromSidebar}
        onSignOut={signOut}
        pageTitle="Bảng thanh toán lương"
        user={{
          ...currentUser,
          role: effectiveRoleLabel,
          roleCode: effectiveRoleCode,
        }}
      >
        <div className="space-y-6">
          <Card
            aria-label="Bạn chưa có quyền truy cập bảng lương"
            data-testid="hrm05-forbidden-card"
            padding="lg"
            role="region"
          >
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900">
                Bạn chưa có quyền truy cập bảng lương
              </h2>
              <p className="text-sm text-slate-600">
                Bảng lương toàn cửa hàng, phê duyệt và xác nhận chi trả chỉ dành
                cho Admin.
              </p>
              <p className="text-sm text-slate-600">
                {effectiveRoleLabel} có thể xem phiếu lương của chính mình. Liên
                hệ Admin để kiểm tra phân quyền.
              </p>
              <div className="pt-2">
                <Link
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700"
                  to={`${hrPaths.payslip}${location.search}`}
                >
                  Xem phiếu lương cá nhân
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </MainLayout>
    )
  }

  const hasError = periodsQuery.isError || periodQuery.isError
  const isLoading =
    periodsQuery.isLoading || (Boolean(activePeriodKey) && periodQuery.isLoading)

  const pageSubtitle = summary
    ? summary.status === 'draft'
      ? `${summary.payrollCode} · Bản nháp · Chưa duyệt · Nguồn công ${summary.attendanceSourceCode}`
      : summary.status === 'approved_unpaid'
        ? `${summary.payrollCode} · Đã duyệt và khóa · Chưa thanh toán`
        : summary.status === 'partially_paid'
          ? `${summary.payrollCode} · Đã trả ${summary.paidRowsCount}/${summary.allRowsCount} nhân viên · Còn lại ${formatVnd(summary.kpi.remainingAmount)}`
          : `${summary.payrollCode} · ${summary.periodRangeLabel} · Nguồn ${summary.attendanceSourceCode} đã khóa · Đã duyệt ngày ${summary.approvedDate ?? '-'}`
    : hasError
      ? 'Không thể tải dữ liệu bảng lương.'
      : isLoading
        ? 'Đang tải bảng lương...'
        : 'Chưa có kỳ lương nào.'

  const isDraft = summary?.status === 'draft'
  const zaloRecipients =
    summary?.rows.filter((r) => r.zaloStatus !== 'sent') ?? []
  const effectiveZaloRecipients =
    zaloRecipients.length > 0 ? zaloRecipients : summary?.rows ?? []

  return (
    <MainLayout
      actionButton={
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            className="min-h-[44px]"
            disabled={!summary}
            onClick={handleExportCsv}
            type="button"
            variant="secondary"
          >
            Xuất Excel / PDF
          </Button>
          <Button
            className="min-h-[44px]"
            data-testid="hrm05-zalo-btn"
            disabled={!summary || isDraft}
            onClick={() => setIsZaloOpen(true)}
            type="button"
            variant="primary"
          >
            Gửi phiếu lương qua Zalo
          </Button>
        </div>
      }
      breadcrumbs={[
        { label: 'Không gian làm việc' },
        { label: 'Nhân sự & tiền lương', to: '/hr' },
        { label: 'Bảng thanh toán lương' },
      ]}
      currentPath="hr"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageSubtitle={pageSubtitle}
      pageTitle="Bảng thanh toán lương"
      user={currentUser}
    >
      <div className="space-y-6">
        {hasError ? (
          <Card padding="lg" title="Không thể tải bảng lương">
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Đã xảy ra lỗi khi tải dữ liệu bảng lương từ máy chủ. Vui lòng thử lại.
              </p>
              <Button
                className="min-h-[44px]"
                data-testid="hrm05-retry-btn"
                onClick={() => {
                  void periodsQuery.refetch()
                  if (activePeriodKey) void periodQuery.refetch()
                }}
                type="button"
                variant="primary"
              >
                Thử lại
              </Button>
            </div>
          </Card>
        ) : isLoading ? (
          <Card padding="lg" title="Đang tải bảng lương">
            <p className="text-sm text-slate-600">
              Đang đồng bộ dữ liệu kỳ lương...
            </p>
          </Card>
        ) : !summary ? (
          <Card padding="lg" title="Chưa có dữ liệu kỳ lương">
            <p className="text-sm text-slate-600">
              Chưa có kỳ lương nào được khởi tạo trong hệ thống.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                description={`${summary.kpi.totalEmployees} nhân viên trong kỳ lương`}
                label="Tổng lương thực lĩnh"
                value={formatVnd(summary.kpi.totalNetPay)}
              />
              <StatCard
                description={
                  summary.kpi.paidAmount > 0 && summary.kpi.remainingAmount === 0
                    ? `${summary.payoutMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'} · ${summary.payoutDate ?? '-'}`
                    : `Còn phải trả: ${formatVnd(summary.kpi.remainingAmount)}`
                }
                label="Đã chi trả"
                value={formatVnd(summary.kpi.paidAmount)}
              />
              <StatCard
                description="Hệ số 1,5 × đơn giá giờ"
                label="OT được duyệt"
                value={`${summary.kpi.approvedOtHours} giờ`}
              />
              <StatCard
                description={
                  isDraft
                    ? 'Chỉ gửi sau khi Admin duyệt'
                    : summary.kpi.zaloSentCount === summary.kpi.totalEmployees
                      ? 'Zalo · Đã gửi thành công'
                      : summary.kpi.zaloUnsentCount +
                            summary.kpi.zaloFailedCount >
                          0
                        ? `${summary.kpi.zaloUnsentCount} chưa gửi · ${summary.kpi.zaloFailedCount} lỗi cần gửi lại`
                        : 'Chỉ gửi sau khi Admin duyệt'
                }
                label="Phiếu lương đã gửi"
                value={`${summary.kpi.zaloSentCount} / ${summary.kpi.totalEmployees}`}
              />
            </div>

            <PayrollTableSection
              isApproving={approveMutation.isPending}
              isInitializing={initializeMutation.isPending}
              onApprovePayroll={async () => {
                try {
                  await approveMutation.mutateAsync({
                    periodKey: summary.periodKey,
                    actorName: currentUser.name,
                  })
                  notify.success(
                    `Đã duyệt & chốt bảng lương ${summary.payrollCode}.`,
                  )
                } catch (error) {
                  notify.error(
                    error instanceof Error
                      ? error.message
                      : 'Không thể duyệt bảng lương.',
                  )
                }
              }}
              onInitializeFromAttendance={async () => {
                try {
                  await initializeMutation.mutateAsync({
                    periodKey: summary.periodKey,
                    actorName: currentUser.name,
                  })
                  notify.success(
                    `Đã khởi tạo lại ${summary.payrollCode} từ ${summary.attendanceSourceCode}.`,
                  )
                } catch (error) {
                  notify.error(
                    error instanceof Error
                      ? error.message
                      : 'Không thể khởi tạo bảng lương.',
                  )
                }
              }}
              onOpenBreakdown={(row) => setDrawerRow(row)}
              onOpenManualAdjust={() => setIsManualAdjustOpen(true)}
              onPageChange={setPage}
              onPayoutFilterChange={(next) => {
                setPayoutFilter(next)
                setPage(1)
              }}
              onPeriodChange={handlePeriodChange}
              onSearchChange={(next) => {
                setSearch(next)
                setPage(1)
              }}
              onStatusFilterChange={(next) => {
                setStatusFilter(next)
                setPage(1)
              }}
              onToggleSelectAllUnpaid={() => {
                const unpaidIds = summary.rows
                  .filter((r) => r.payoutStatus === 'unpaid')
                  .map((r) => r.id)
                const allSelected =
                  unpaidIds.length > 0 &&
                  unpaidIds.every((id) => selectedIds.includes(id))
                setSelectedIds(allSelected ? [] : unpaidIds)
              }}
              onToggleSelectRow={(id) => {
                setSelectedIds((prev) =>
                  prev.includes(id)
                    ? prev.filter((item) => item !== id)
                    : [...prev, id],
                )
              }}
              page={page}
              payoutFilter={payoutFilter}
              periodKey={activePeriodKey}
              periodOptions={periodOptions}
              search={search}
              selectedIds={selectedIds}
              statusFilter={statusFilter}
              summary={summary}
            />

            <PayrollBottomPanels
              onOpenBatchPayoutModal={() => setIsBatchPayoutOpen(true)}
              onOpenUnlockModal={() => setIsUnlockOpen(true)}
              onPayoutDateInputChange={setPayoutDateInput}
              onPayoutMethodChange={setPayoutMethod}
              onSelectUnpaidEmployees={() => {
                setSelectedIds(
                  summary.rows
                    .filter((r) => r.payoutStatus === 'unpaid')
                    .map((r) => r.id),
                )
              }}
              onTransactionRefInputChange={setTransactionRefInput}
              payoutDateInput={payoutDateInput}
              payoutMethod={payoutMethod}
              selectedIds={selectedIds}
              summary={summary}
              transactionRefInput={transactionRefInput}
            />

            <PayrollUnlockModal
              actorName={currentUser.name}
              isOpen={isUnlockOpen}
              onClose={() => setIsUnlockOpen(false)}
              onSuccess={() => setSelectedIds([])}
              payrollCode={summary.payrollCode}
              periodKey={summary.periodKey}
            />

            <PayrollBatchPayoutModal
              actorName={currentUser.name}
              initialMethod={payoutMethod}
              initialPayoutDate={payoutDateInput}
              initialTransactionRef={transactionRefInput}
              isOpen={isBatchPayoutOpen}
              nextBatchNumber={summary.batches.length + 1}
              onClose={() => setIsBatchPayoutOpen(false)}
              onSuccess={() => setSelectedIds([])}
              payrollCode={summary.payrollCode}
              periodKey={summary.periodKey}
              selectedRows={summary.rows.filter(
                (r) =>
                  selectedIds.includes(r.id) && r.payoutStatus === 'unpaid',
              )}
            />

            <PayrollZaloPreviewModal
              codeLabel={summary.payrollCode}
              isOpen={isZaloOpen}
              isPending={sendZaloMutation.isPending}
              mode="batch"
              onClose={() => setIsZaloOpen(false)}
              onConfirm={async (recipientIds) => {
                try {
                  await sendZaloMutation.mutateAsync({
                    periodKey: summary.periodKey,
                    employeeIds: recipientIds,
                    actorName: currentUser.name,
                  })
                  notify.success(
                    `Đã gửi ${recipientIds.length} phiếu lương qua Zalo.`,
                  )
                  setIsZaloOpen(false)
                } catch (error) {
                  notify.error(
                    error instanceof Error
                      ? error.message
                      : 'Không thể gửi phiếu lương qua Zalo.',
                  )
                }
              }}
              periodKey={summary.periodKey}
              recipients={effectiveZaloRecipients}
            />

            <PayrollManualAdjustModal
              actorName={currentUser.name}
              isOpen={isManualAdjustOpen}
              onClose={() => setIsManualAdjustOpen(false)}
              payrollCode={summary.payrollCode}
              periodKey={summary.periodKey}
              rows={summary.rows}
            />

            <PayrollBreakdownDrawer
              breakdown={breakdownQuery.data}
              isLoadingBreakdown={breakdownQuery.isLoading}
              onClose={() => setDrawerRow(null)}
              onOpenAdvanceVoucher={(_employeeId, line?: PayrollBreakdownLine) => {
                if (!drawerRow) return
                const targetLine =
                  line ??
                  (breakdownQuery.data?.deductionItems ?? drawerRow.deductionItems).find(
                    (item) => Boolean(item.voucherCode),
                  )
                setAdvanceDrawerState({
                  row: drawerRow,
                  voucher: {
                    voucherCode: targetLine?.voucherCode ?? '',
                    employeeLabel: `${drawerRow.fullName} · ${drawerRow.employeeCode}`,
                    amount: targetLine?.amount ?? drawerRow.deduction,
                    receivedDate: summary.payoutDate ?? '-',
                    payoutMethod: 'Khấu trừ lương kỳ',
                    approverLabel: summary.approvedBy ?? 'Admin',
                    content: targetLine?.label ?? 'Tạm ứng lương',
                    attachmentName: '-',
                    footnote: '',
                  },
                })
              }}
              payrollCode={summary.payrollCode}
              row={drawerRow}
            />

            <PayslipSourceDrawer
              advanceVoucher={advanceDrawerState?.voucher}
              drawerType={advanceDrawerState ? 'advance' : null}
              employeeCode={advanceDrawerState?.row.employeeCode}
              employeeName={advanceDrawerState?.row.fullName}
              onClose={() => setAdvanceDrawerState(null)}
              payslipCode={summary.payrollCode}
              periodKey={summary.periodKey}
              periodRange={summary.periodRangeLabel}
            />
          </>
        )}
      </div>
    </MainLayout>
  )
}
