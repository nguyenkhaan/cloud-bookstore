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
import { usePayslipDetailQuery } from '../hr-payroll.hook'
import { PAYSLIP_PERIOD_OPTIONS } from '../hr-payroll.mock'
import {
  formatHrRoleLabel,
  isHrAdmin,
  resolveHrRoleCode,
} from '../hr-role.util'

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

  const payslipQuery = usePayslipDetailQuery(targetEmployeeId, periodKey)
  const payslip = payslipQuery.data

  const navigateFromSidebar = (id: string) => {
    const targetPath = workspacePathFor(id)
    if (targetPath) navigate(targetPath)
  }

  const headerUser = isAdmin
    ? currentUser
    : {
        ...currentUser,
        name:
          payslip?.employeeName ??
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
    ? `Góc nhìn Admin · Đối soát phiếu lương của ${payslip?.employeeName ?? 'Trần Hoàng Phong'}`
    : `Phiếu lương của bạn · ${payslip?.employeeCode ?? targetEmployeeId} · ${
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
                `Đang chuẩn bị tải PDF phiếu lương ${payslip?.payslipCode ?? ''}.`,
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
        {!payslip && !payslipQuery.isLoading && (
          <Card role="status">
            <p className="text-sm font-semibold text-slate-800">Chưa thể tải phiếu lương cá nhân.</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Hồ sơ tài khoản chưa có mã nhân viên đồng bộ. Cần backend cung cấp mapping SELF trước khi hiển thị dữ liệu lương.</p>
          </Card>
        )}
        {payslip && (
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
                  options={PAYSLIP_PERIOD_OPTIONS.map((item) => ({
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
        )}

        {payslip && (
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
        )}
      </div>
    </MainLayout>
  )
}
