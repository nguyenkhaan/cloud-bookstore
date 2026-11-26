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
  const activeQuery = routeEmployeeId ? payslipQuery : myPayslipQuery
  const payslip = activeQuery.data

  if (!currentUser) return null

  const navigateFromSidebar = (id: string) => {
    const targetPath = workspacePathFor(id)
    if (targetPath) navigate(targetPath)
  }

  const headerUser = currentUser
  const hasPayslip = Boolean(payslip?.hasPayslip)

  const pageSubtitle = !hasPayslip
    ? `${currentUser.name} · ${effectiveRoleLabel}`
    : isAdmin && routeEmployeeId
      ? `Góc nhìn Admin · Đối soát phiếu lương của ${payslip?.employeeName ?? ''}`
      : `Phiếu lương của bạn · ${payslip?.employeeCode ?? ''} · ${effectiveRoleLabel}`

  return (
    <MainLayout
      actionButton={
        hasPayslip ? (
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
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
        ) : undefined
      }
      breadcrumbs={[
        { label: 'Không gian làm việc' },
        { label: 'Nhân sự & tiền lương', to: '/hr' },
        { label: routeEmployeeId ? 'Đối soát phiếu lương' : 'Phiếu lương cá nhân' },
      ]}
      currentPath="hr"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageSubtitle={pageSubtitle}
      pageTitle={routeEmployeeId ? 'Chi tiết phiếu lương' : 'Phiếu lương cá nhân'}
      user={headerUser}
    >
      <div className="space-y-6">
        {activeQuery.isLoading ? (
          <Card padding="lg" title="Đang tải phiếu lương">
            <p className="text-sm text-slate-600">
              Đang tải thông tin phiếu lương từ hệ thống...
            </p>
          </Card>
        ) : activeQuery.isError ? (
          <Card padding="lg" title="Không thể tải phiếu lương">
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Đã xảy ra lỗi khi tải phiếu lương. Vui lòng thử lại.
              </p>
              <Button
                className="min-h-[44px]"
                data-testid="hrm06-retry-btn"
                onClick={() => void activeQuery.refetch()}
                type="button"
                variant="primary"
              >
                Thử lại
              </Button>
            </div>
          </Card>
        ) : !payslip || !payslip.hasPayslip ? (
          <Card
            data-testid="hrm06-empty-state"
            padding="lg"
            title="Chưa có phiếu lương được công bố"
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {payslip?.employeeName
                  ? `${payslip.employeeName} hiện chưa có phiếu lương nào đã được Admin duyệt và công bố.`
                  : 'Bạn hiện chưa có phiếu lương nào đã được Admin duyệt và công bố.'}
              </p>
              {payslip && payslip.availablePeriods.length > 0 && (
                <div className="max-w-xs">
                  <SelectBox
                    label="Chọn kỳ lương đã công bố"
                    onChange={setPeriodKey}
                    options={payslip.availablePeriods.map((item) => ({
                      value: item.periodKey,
                      label: `${item.periodKey} · ${item.statusShortLabel}`,
                    }))}
                    searchable={false}
                    value={periodKey}
                  />
                </div>
              )}
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-8 print:col-span-12">
                <PayslipBreakdownCard
                  onOpenDrawer={(type) => setDrawerType(type)}
                  payslip={payslip}
                />
              </div>

              <div className="min-w-0 space-y-6 lg:col-span-4 print:hidden">
                <Card padding="lg" title="Kỳ lương">
                  <SelectBox
                    label="Tháng / Năm"
                    onChange={setPeriodKey}
                    options={payslip.availablePeriods.map((item) => ({
                      value: item.periodKey,
                      label: `${item.periodKey} · ${item.statusShortLabel}`,
                    }))}
                    searchable={false}
                    value={periodKey || payslip.periodKey}
                  />
                </Card>

                {isAdmin && routeEmployeeId ? (
                  <PayslipAdminReconcilePanel payslip={payslip} />
                ) : (
                  <PayslipDisputePanel
                    disputes={payslip.disputes}
                    employeeId={payslip.employeeId}
                    entryId={payslip.entryId ?? ''}
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
          </>
        )}
      </div>
    </MainLayout>
  )
}
