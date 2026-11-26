import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { SelectBox } from '@/components/common/SelectBox'
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
import { formatHrRoleLabel, isHrAdmin, resolveHrRoleCode } from '../hr-role.util'
import { useEmployeePayslipDetailQuery, useMyPayslipDetailQuery } from '../hr-payroll.hook'

export default function PayslipPage() {
  const navigate = useNavigate()
  const { employeeId: routeEmployeeId } = useParams<{ employeeId?: string }>()
  const { session, signOut } = useAuth()

  const currentUser = session?.user
  const effectiveRoleCode = resolveHrRoleCode(currentUser)
  const isAdmin = isHrAdmin(effectiveRoleCode)
  const effectiveRoleLabel = formatHrRoleLabel(effectiveRoleCode)
  const [periodKey, setPeriodKey] = useState<string>('')
  const [drawerType, setDrawerType] = useState<PayslipSourceDrawerType | null>(null)
  const payslipQuery = useEmployeePayslipDetailQuery(routeEmployeeId ?? '', periodKey, Boolean(routeEmployeeId))
  const myPayslipQuery = useMyPayslipDetailQuery(periodKey, !routeEmployeeId)
  const payslip = routeEmployeeId ? payslipQuery.data : myPayslipQuery.data

  if (!currentUser || !payslip) return null

  const navigateFromSidebar = (id: string) => {
    const targetPath = workspacePathFor(id)
    if (targetPath) navigate(targetPath)
  }

  const headerUser = currentUser

  const pageSubtitle = isAdmin
    ? `Góc nhìn Admin · Đối soát phiếu lương của ${payslip.employeeName}`
    : `Phiếu lương của bạn · ${payslip.employeeCode} · ${effectiveRoleLabel}`

  return (
    <MainLayout
      actionButton={
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            className="min-h-[44px]"
            onClick={() => window.print()}
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
