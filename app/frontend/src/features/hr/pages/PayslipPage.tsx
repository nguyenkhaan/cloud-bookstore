import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { SelectBox } from '@/components/common/SelectBox'
import { notify } from '@/components/common/Toast'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { PayslipAdminReconcilePanel } from '../components/PayslipAdminReconcilePanel'
import { PayslipBreakdownCard } from '../components/PayslipBreakdownCard'
import { PayslipDisputePanel } from '../components/PayslipDisputePanel'
import {
  PayslipSourceDrawer,
  type PayslipSourceDrawerType,
} from '../components/PayslipSourceDrawer'
import type { PayslipDetailDto } from '../hr-payroll.type'
import {
  formatHrRoleLabel,
  isHrAdmin,
  resolveHrRoleCode,
} from '../hr-role.util'

const MOCK_PAYSLIP: PayslipDetailDto = {
  payslipCode: 'PAY-202609-NV0002',
  periodKey: '09/2026',
  periodRange: '01/09–30/09/2026',
  payrollCode: 'PAY-202609',
  attendanceSourceCode: 'ATT-202609',
  payrollStatus: 'settled',
  payoutStatus: 'paid',
  payoutDate: '03/10/2026',
  expectedPayoutDate: '03/10/2026',
  approvedBy: 'Nguyễn Minh Anh',
  approvedAt: '02/10/2026 · 14:20',
  employeeId: 'NV-0002',
  employeeCode: 'NV-0002',
  employeeName: 'Trần Hoàng Phong',
  employeeRoleLabel: 'Thu ngân',
  storeName: 'Nhà sách Mây · Cơ sở 01',
  bankAccount: 'Vietcombank •••• 2802',
  transactionRef: 'BANK-PAY-20261003-001',
  standardHours: 160,
  hourlyRate: 30000,
  baseSalary: 4800000,
  overtimeHours: 4,
  overtimeAmount: 180000,
  bonus: 300000,
  bonusNote: 'Thưởng hiệu suất phục vụ tháng 09',
  allowance: 200000,
  allowanceNote: 'Ăn ca / Đi lại',
  mandatoryContribution: 0,
  mandatoryContributionNote: 'Hồ sơ minh họa: thử việc, chưa tham gia',
  taxAmount: 0,
  taxNote: '0đ · Cần đối chiếu hồ sơ thuế minh họa',
  deduction: 100000,
  advanceVoucherCode: 'ADV-0921',
  totalIncome: 5480000,
  totalDeduction: 100000,
  netPay: 5380000,
  netPayInWords: 'Năm triệu ba trăm tám mươi nghìn đồng.',
  zaloStatus: 'sent',
  zaloSentAt: '03/10/2026, 09:35',
  zaloLinked: true,
  availablePeriods: [
    { periodKey: '10/2026', status: 'pending_payout', statusShortLabel: 'Chờ trả' },
    { periodKey: '09/2026', status: 'paid', statusShortLabel: 'Đã trả' },
    { periodKey: '08/2026', status: 'paid', statusShortLabel: 'Đã trả' },
    { periodKey: '07/2026', status: 'paid', statusShortLabel: 'Đã trả' },
  ],
  attendanceDays: [
    { date: '01/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
    { date: '02/09/2026', checkInOut: '08:00 / 17:00', standardHours: 8, otHours: 0 },
    { date: '24/09/2026', checkInOut: '08:00 / 19:00', standardHours: 8, otHours: 2 },
  ],
  overtimeEntries: [
    { date: '24/09/2026', timeRange: '17:00-19:00', hours: 2, amount: 90000 },
    { date: '28/09/2026', timeRange: '17:00-19:00', hours: 2, amount: 90000 },
  ],
  advanceVoucher: {
    voucherCode: 'ADV-0921',
    employeeLabel: 'Trần Hoàng Phong · NV-0002',
    amount: 100000,
    receivedDate: '21/09/2026',
    payoutMethod: 'Tiền mặt · PC-20260921-003',
    approverLabel: 'Nguyễn Minh Anh · Quản trị viên',
    content: 'Tạm ứng nội bộ, khấu trừ trong lương tháng 09/2026.',
    attachmentName: 'bien-nhan-ADV-0921.pdf · Đã xác nhận nhận tiền',
    footnote: 'Khấu trừ trên phiếu PAY-202609-NV0002: -100.000đ.',
  },
  disputes: [
    {
      id: 'DC-0926-003',
      payslipCode: 'PAY-202609-NV0002',
      category: 'allowance',
      categoryLabel: 'Phụ cấp',
      status: 'pending_response',
      statusLabel: 'Chờ quản lý phản hồi',
      content: 'Kiểm tra lại khoản phụ cấp trách nhiệm ca tối tháng 09/2026.',
      submittedAt: '03/10/2026, 15:10',
    },
    {
      id: 'DC-0926-002',
      payslipCode: 'PAY-202609-NV0002',
      category: 'base_salary',
      categoryLabel: 'Giờ công',
      status: 'explained',
      statusLabel: 'Đã giải trình',
      content: 'Đối chiếu lại tổng giờ công tiêu chuẩn ngày 15/09.',
      submittedAt: '03/10/2026, 11:05',
      adminName: 'Nguyễn Minh Anh',
      adminRole: 'Quản trị viên',
      respondedAt: '03/10/2026, 16:45',
      adminResponse: 'Đã kiểm tra bảng công ATT-202609, tổng 160 giờ chuẩn chính xác.',
    },
    {
      id: 'DC-0926-001',
      payslipCode: 'PAY-202609-NV0002',
      category: 'overtime',
      categoryLabel: 'OT',
      status: 'approved_next_period',
      statusLabel: 'Đã duyệt bù trừ kỳ sau',
      content: 'Đề nghị bổ sung 2 giờ OT ngày 28/09/2026.',
      submittedAt: '03/10/2026, 09:50',
      adminName: 'Nguyễn Minh Anh',
      adminRole: 'Quản trị viên',
      respondedAt: '04/10/2026, 10:20',
      adminResponse: 'Đã xác minh thêm 2 giờ OT, duyệt bù trừ vào kỳ 10/2026.',
    },
  ],
}

const MOCK_PERIOD_RANGES: Record<string, string> = {
  '10/2026': '01/10–31/10/2026',
  '09/2026': '01/09–30/09/2026',
  '08/2026': '01/08–31/08/2026',
  '07/2026': '01/07–31/07/2026',
}

function getMockPayslip(employeeId: string, periodKey: string): PayslipDetailDto {
  const normalizedPeriod = MOCK_PAYSLIP.availablePeriods.some((period) => period.periodKey === periodKey)
    ? periodKey
    : MOCK_PAYSLIP.periodKey
  const compactPeriod = normalizedPeriod.replace('/', '')
  const isPendingPayout = normalizedPeriod === '10/2026'
  const employeeCode = employeeId || MOCK_PAYSLIP.employeeCode
  const payslipCode = `PAY-${compactPeriod.slice(2)}${compactPeriod.slice(0, 2)}-${employeeCode.replace(/-/g, '')}`

  return {
    ...MOCK_PAYSLIP,
    payslipCode,
    periodKey: normalizedPeriod,
    periodRange: MOCK_PERIOD_RANGES[normalizedPeriod] ?? MOCK_PAYSLIP.periodRange,
    payrollCode: `PAY-${compactPeriod.slice(2)}${compactPeriod.slice(0, 2)}`,
    attendanceSourceCode: `ATT-${compactPeriod.slice(2)}${compactPeriod.slice(0, 2)}`,
    payrollStatus: isPendingPayout ? 'approved_unpaid' : 'settled',
    payoutStatus: isPendingPayout ? 'pending_payout' : 'paid',
    payoutDate: isPendingPayout ? undefined : '03/10/2026',
    expectedPayoutDate: isPendingPayout ? '03/11/2026' : '03/10/2026',
    transactionRef: isPendingPayout ? undefined : MOCK_PAYSLIP.transactionRef,
    employeeId: employeeCode,
    employeeCode,
    disputes: MOCK_PAYSLIP.disputes.map((dispute) => ({ ...dispute, payslipCode })),
  }
}

export default function PayslipPage() {
  const navigate = useNavigate()
  const { employeeId: routeEmployeeId } = useParams<{ employeeId?: string }>()
  const { session, signOut } = useAuth()

  const currentUser = session?.user ?? {
    name: 'Nguyễn Minh Anh',
    role: 'Quản trị viên',
    roleCode: 'ADMIN',
  }
  const effectiveRoleCode = resolveHrRoleCode(currentUser)
  const isAdmin = isHrAdmin(effectiveRoleCode)
  const effectiveRoleLabel = formatHrRoleLabel(effectiveRoleCode)

  const targetEmployeeId = isAdmin ? (routeEmployeeId || 'NV-0002') : (currentUser.id ?? '')

  const [periodKey, setPeriodKey] = useState('09/2026')
  const [drawerType, setDrawerType] =
    useState<PayslipSourceDrawerType | null>(null)

  const payslip = getMockPayslip(targetEmployeeId, periodKey)

  const navigateFromSidebar = (id: string) => {
    const targetPath = workspacePathFor(id)
    if (targetPath) navigate(targetPath)
  }

  const headerUser = isAdmin
    ? currentUser
    : {
        ...currentUser,
        name:
          payslip.employeeName ??
          (effectiveRoleCode === 'INVENTORY_MANAGER'
            ? 'Lê Minh Khoa'
            : 'Trần Hoàng Phong'),
        role:
          effectiveRoleCode === 'CASHIER'
            ? 'Thu ngân'
            : effectiveRoleLabel,
        roleCode: effectiveRoleCode,
      }

  const pageSubtitle = isAdmin
    ? `Góc nhìn Admin · Đối soát phiếu lương của ${payslip.employeeName}`
    : `Phiếu lương của bạn · ${payslip.employeeCode} · ${
        effectiveRoleCode === 'CASHIER'
          ? 'Thu ngân'
          : effectiveRoleLabel
      }`

  return (
    <MainLayout
      actionButton={
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            className="min-h-[44px]"
            onClick={() => {
              notify.success(
                `Đang chuẩn bị tải PDF phiếu lương ${payslip.payslipCode}.`,
              )
            }}
            type="button"
            variant="secondary"
          >
            Tải PDF
          </Button>
          <Button
            className="min-h-[44px]"
            onClick={() => window.print()}
            type="button"
            variant="primary"
          >
            In phiếu lương
          </Button>
        </div>
      }
      breadcrumbs={[
        { label: 'Không gian làm việc' },
        { label: 'Nhân sự & tiền lương', to: '/hr' },
        { label: 'Phiếu lương cá nhân' },
      ]}
      currentPath="hr"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageSubtitle={pageSubtitle}
      pageTitle="Phiếu lương cá nhân"
      user={headerUser}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-8">
              <PayslipBreakdownCard
                onOpenDrawer={(type) => setDrawerType(type)}
                payslip={payslip}
              />
            </div>

            <div className="min-w-0 space-y-6 lg:col-span-4">
              <Card padding="lg" title="Kỳ lương">
                <SelectBox
                  label="Tháng / Năm"
                  onChange={setPeriodKey}
                  options={payslip.availablePeriods.map((item) => ({
                    value: item.periodKey,
                    label: item.periodKey,
                  }))}
                  searchable={false}
                  value={periodKey}
                />
              </Card>

              {isAdmin ? (
                <PayslipAdminReconcilePanel payslip={payslip} />
              ) : (
                <PayslipDisputePanel
                  disputes={payslip.disputes}
                  employeeId={payslip.employeeId}
                  periodKey={payslip.periodKey}
                />
              )}
            </div>
        </div>

        <PayslipSourceDrawer
            advanceVoucher={payslip.advanceVoucher}
            approvedBy={payslip.approvedBy}
            attendanceDays={payslip.attendanceDays}
            attendanceSourceCode={payslip.attendanceSourceCode}
            drawerType={drawerType}
            employeeCode={payslip.employeeCode}
            employeeName={payslip.employeeName}
            hourlyRate={payslip.hourlyRate}
            onClose={() => setDrawerType(null)}
            overtimeAmount={payslip.overtimeAmount}
            overtimeEntries={payslip.overtimeEntries}
            overtimeHours={payslip.overtimeHours}
            payslipCode={payslip.payslipCode}
            periodKey={payslip.periodKey}
            periodRange={payslip.periodRange}
            standardHours={payslip.standardHours}
        />
      </div>
    </MainLayout>
  )
}
