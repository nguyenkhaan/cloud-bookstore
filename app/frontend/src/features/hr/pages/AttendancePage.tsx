import { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '@/context/AuthProvider'
import { Button } from '@/components/common'
import { MainLayout } from '@/components/layout'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { AttendanceAdjustmentDialog } from '../components/AttendanceAdjustmentDialog'
import { AttendanceFilters, type AttendanceStatusFilter, type PayrollFilter } from '../components/AttendanceFilters'
import { AttendanceSummaryCards } from '../components/AttendanceSummaryCards'
import { AttendanceTable } from '../components/AttendanceTable'
import { TodayAttendanceCard } from '../components/TodayAttendanceCard'
import type { AttendanceRowDisplay } from '../hr-shift.type'

const initialRows: AttendanceRowDisplay[] = [
  { id: 'attendance-001', employeeId: 'NV-0002', employeeName: 'Trần Hoàng Phong', workDate: '18/10/2026', shiftOrder: 'Ca sáng', checkIn: '07:58', checkOut: '13:01', workedHours: 5, state: 'present', payrollStatus: 'paid', shiftPay: 250000 },
  { id: 'attendance-002', employeeId: 'NV-0003', employeeName: 'Lê Minh Khoa', workDate: '18/10/2026', shiftOrder: 'Ca chiều', checkIn: '13:10', checkOut: '18:00', workedHours: 4.8, state: 'late', payrollStatus: 'unpaid', shiftPay: 250000 },
  { id: 'attendance-003', employeeId: 'NV-0004', employeeName: 'Nguyễn Thanh Tâm', workDate: '18/10/2026', shiftOrder: 'Ca tối', state: 'absent', payrollStatus: 'unpaid', shiftPay: 280000 },
  { id: 'attendance-004', employeeId: 'NV-0005', employeeName: 'Lê Mai Linh', workDate: '18/10/2026', shiftOrder: 'Ca sáng', checkIn: '08:03', state: 'missing-attendance', payrollStatus: 'unpaid', shiftPay: 250000 },
  { id: 'attendance-005', employeeId: 'NV-0006', employeeName: 'Nguyễn Hoài An', workDate: '18/10/2026', shiftOrder: 'Ca chiều', checkIn: '13:00', checkOut: '18:00', workedHours: 5, state: 'adjustment-pending', payrollStatus: 'unpaid', shiftPay: 250000, adjustmentReason: 'Bổ sung chứng từ check-out.' },
]

export default function AttendancePage() {
  const navigate = useNavigate()
  const auth = useContext(AuthContext)
  const currentUser = auth?.session?.user ?? { name: 'Khách', role: 'Admin view' }
  const [rows, setRows] = useState(initialRows)
  const [date, setDate] = useState('2026-10-18')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<AttendanceStatusFilter>('all')
  const [payroll, setPayroll] = useState<PayrollFilter>('all')
  const [selectedRow, setSelectedRow] = useState<AttendanceRowDisplay>()
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const isAdminView = currentUser.role.toLowerCase().includes('admin')
  const selectedDateLabel = date === '2026-10-18' ? '18/10/2026' : date.split('-').reverse().join('/')

  const filteredRows = useMemo(() => rows.filter((row) => {
    if (row.workDate !== selectedDateLabel) return false
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (normalizedQuery && !`${row.employeeId} ${row.employeeName}`.toLocaleLowerCase().includes(normalizedQuery)) return false
    if (status !== 'all' && row.state !== status) return false
    if (payroll !== 'all' && row.payrollStatus !== payroll) return false
    return true
  }), [payroll, query, rows, selectedDateLabel, status])

  const todayRow = rows[0]
  const openAdjustment = (row: AttendanceRowDisplay) => { setSelectedRow(row); setIsAdjustmentOpen(true) }

  return (
    <MainLayout
      actionButton={<Button onClick={() => undefined} size="sm" variant="secondary">Xuất danh sách</Button>}
      breadcrumbs={[{ label: 'Không gian làm việc' }, { label: 'Nhân sự & tiền lương', to: '/hr' }, { label: 'Chấm công' }]}
      currentPath="hr"
      onNavigate={(item) => { const path = workspacePathFor(item); if (path) navigate(path) }}
      onSignOut={auth?.signOut}
      pageTitle="Điểm danh & Chấm công theo ca"
      screenCode=""
      user={currentUser}
    >
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto]"><TodayAttendanceCard onCheckIn={() => setRows((current) => current.map((row, index) => index === 0 ? { ...row, checkIn: row.checkIn ?? '10:24' } : row))} onCheckOut={() => setRows((current) => current.map((row, index) => index === 0 ? { ...row, checkOut: row.checkOut ?? '13:00', workedHours: row.workedHours ?? 5, state: 'present' } : row))} row={todayRow} /></div>
        <AttendanceSummaryCards absent={filteredRows.filter((row) => row.state === 'absent').length} late={filteredRows.filter((row) => row.state === 'late').length} missing={filteredRows.filter((row) => row.state === 'missing-attendance').length} present={filteredRows.filter((row) => row.state === 'present').length} />
        <AttendanceFilters date={date} onDateChange={setDate} onPayrollChange={setPayroll} onQueryChange={setQuery} onStatusChange={setStatus} payroll={payroll} query={query} status={status} />
        <AttendanceTable onAdjust={openAdjustment} rows={filteredRows} />
      </div>
      <AttendanceAdjustmentDialog key={isAdjustmentOpen ? selectedRow?.id ?? 'new' : 'closed'} onClose={() => setIsAdjustmentOpen(false)} onSubmit={(reason) => { if (selectedRow) setRows((current) => current.map((row) => row.id === selectedRow.id ? { ...row, state: 'adjustment-pending', adjustmentReason: reason } : row)); setIsAdjustmentOpen(false) }} open={isAdjustmentOpen} row={selectedRow} />
    </MainLayout>
  )
}
