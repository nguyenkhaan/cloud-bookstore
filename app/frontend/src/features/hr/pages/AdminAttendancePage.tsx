import { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '@/context/AuthProvider'
import { Button } from '@/components/common'
import { MainLayout } from '@/components/layout'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { attendanceDateLabel, attendanceDemoDate, attendanceRows } from '../attendance.data'
import { AdminHrTabs } from '../components/AdminHrTabs'
import { AttendanceAdjustmentDialog } from '../components/AttendanceAdjustmentDialog'
import { AttendanceFilters, type AttendanceStatusFilter, type PayrollFilter } from '../components/AttendanceFilters'
import { AttendanceSummaryCards } from '../components/AttendanceSummaryCards'
import { AttendanceTable } from '../components/AttendanceTable'
import type { AttendanceRowDisplay } from '../hr-shift.type'

export default function AdminAttendancePage() {
  const navigate = useNavigate()
  const auth = useContext(AuthContext)
  const currentUser = auth?.session?.user ?? { name: 'Admin', role: 'Admin' }
  const [rows, setRows] = useState(attendanceRows)
  const [date, setDate] = useState(attendanceDemoDate)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<AttendanceStatusFilter>('all')
  const [payroll, setPayroll] = useState<PayrollFilter>('all')
  const [selectedRow, setSelectedRow] = useState<AttendanceRowDisplay>()
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const selectedDateLabel = attendanceDateLabel(date)

  const filteredRows = useMemo(() => rows.filter((row) => {
    if (row.workDate !== selectedDateLabel) return false
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (normalizedQuery && !`${row.employeeId} ${row.employeeName}`.toLocaleLowerCase().includes(normalizedQuery)) return false
    if (status !== 'all' && row.state !== status) return false
    if (payroll !== 'all' && row.payrollStatus !== payroll) return false
    return true
  }), [payroll, query, rows, selectedDateLabel, status])

  const openAdjustment = (row: AttendanceRowDisplay) => { setSelectedRow(row); setIsAdjustmentOpen(true) }

  return (
    <MainLayout
      actionButton={<Button onClick={() => undefined} size="sm" variant="secondary">Xuất danh sách</Button>}
      breadcrumbs={[{ label: 'Không gian làm việc' }, { label: 'Nhân sự' }, { label: 'Chấm công & Lương ca' }]}
      currentPath="admin-hr"
      onNavigate={(item) => { const path = workspacePathFor(item); if (path) navigate(path) }}
      onSignOut={auth?.signOut}
      pageTitle="Chấm công & Lương ca"
      screenCode=""
      user={currentUser}
    >
      <div className="space-y-5">
        <AdminHrTabs activeTab="attendance" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] font-semibold text-indigo-600">Admin view</span>
        </div>
        <AttendanceSummaryCards absent={filteredRows.filter((row) => row.state === 'absent').length} late={filteredRows.filter((row) => row.state === 'late').length} missing={filteredRows.filter((row) => row.state === 'missing-attendance').length} present={filteredRows.filter((row) => row.state === 'present').length} />
        <AttendanceFilters date={date} onDateChange={setDate} onPayrollChange={setPayroll} onQueryChange={setQuery} onStatusChange={setStatus} payroll={payroll} query={query} status={status} />
        <AttendanceTable onAdjust={openAdjustment} rows={filteredRows} />
      </div>
      <AttendanceAdjustmentDialog key={isAdjustmentOpen ? selectedRow?.id ?? 'new' : 'closed'} onClose={() => setIsAdjustmentOpen(false)} onSubmit={(reason) => { if (selectedRow) setRows((current) => current.map((row) => row.id === selectedRow.id ? { ...row, state: 'adjustment-pending', adjustmentReason: reason } : row)); setIsAdjustmentOpen(false) }} open={isAdjustmentOpen} row={selectedRow} />
    </MainLayout>
  )
}
