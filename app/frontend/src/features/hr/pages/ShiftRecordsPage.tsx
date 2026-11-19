import { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '@/context/AuthProvider'
import { Badge, Button } from '@/components/common'
import { MainLayout } from '@/components/layout'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { ShiftDateToolbar, type ShiftStatusFilter } from '../components/ShiftDateToolbar'
import { AdminHrTabs } from '../components/AdminHrTabs'
import { ShiftRecordDrawer } from '../components/ShiftRecordDrawer'
import { ShiftRecordsTable } from '../components/ShiftRecordsTable'
import { ShiftSummaryCards } from '../components/ShiftSummaryCards'
import type { ShiftRecordDisplay } from '../hr-shift.type'

const initialRecords: ShiftRecordDisplay[] = [
  { id: 'shift-001', workDate: '18/10/2026', employeeId: 'NV-0002', employeeName: 'Trần Hoàng Phong', shiftOrder: 'Ca sáng', timeRange: '08:00–13:00', state: 'assigned' },
  { id: 'shift-002', workDate: '18/10/2026', employeeId: 'NV-0003', employeeName: 'Lê Minh Khoa', shiftOrder: 'Ca chiều', timeRange: '13:00–18:00', state: 'attendance-missing' },
  { id: 'shift-003', workDate: '18/10/2026', shiftOrder: 'Ca tối', timeRange: '18:00–22:30', state: 'unassigned', note: 'Cần bổ sung nhân viên trước khi vận hành.' },
  { id: 'shift-004', workDate: '18/10/2026', employeeId: 'NV-0005', employeeName: 'Lê Mai Linh', shiftOrder: 'Ca sáng', timeRange: '08:00–13:00', state: 'assigned' },
]

export default function ShiftRecordsPage() {
  const navigate = useNavigate()
  const auth = useContext(AuthContext)
  const currentUser = auth?.session?.user ?? { name: 'Khách', role: 'Admin view', roleCode: undefined }
  const [records, setRecords] = useState(initialRecords)
  const [date, setDate] = useState('2026-10-18')
  const [employee, setEmployee] = useState('all')
  const [shiftOrder, setShiftOrder] = useState('all')
  const [status, setStatus] = useState<ShiftStatusFilter>('all')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<ShiftRecordDisplay>()
  const isAdminView = currentUser.roleCode === 'ADMIN'
  const adminActionState = 'admin-only'
  const selectedDateLabel = date === '2026-10-18' ? '18/10/2026' : date.split('-').reverse().join('/')

  const filteredRecords = useMemo(() => records.filter((record) => {
    if (record.workDate !== selectedDateLabel) return false
    if (employee !== 'all' && record.employeeId !== employee) return false
    if (shiftOrder !== 'all' && !record.shiftOrder.toLowerCase().includes(shiftOrder === 'morning' ? 'sáng' : shiftOrder === 'afternoon' ? 'chiều' : 'tối')) return false
    if (status !== 'all' && record.state !== status) return false
    return true
  }), [employee, records, selectedDateLabel, shiftOrder, status])

  const assignedEmployees = new Set(filteredRecords.filter((record) => record.employeeId).map((record) => record.employeeId)).size
  const openDrawer = (record?: ShiftRecordDisplay) => { setSelectedRecord(record); setIsDrawerOpen(true) }

  return (
    <MainLayout
      actionButton={isAdminView && <Button onClick={() => openDrawer()} size="sm">+ Thêm bản ghi ca</Button>}
      breadcrumbs={[{ label: 'Không gian làm việc' }, { label: 'Nhân sự' }, { label: 'Phân công ca' }]}
      currentPath="admin-hr"
      onNavigate={(item) => { const path = workspacePathFor(item); if (path) navigate(path) }}
      onSignOut={auth?.signOut}
      pageTitle="Phân công ca"
      screenCode="SCR-HRM-02 / NHÂN SỰ & TIỀN LƯƠNG"
      user={currentUser}
    >
      <div className="space-y-4">
        <AdminHrTabs activeTab="shifts" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Tra cứu và phân công bản ghi ca theo ngày · dữ liệu minh họa</p>
          <Badge dot variant="info">Admin-only action</Badge><span className="sr-only">{adminActionState}</span>
        </div>
        <ShiftDateToolbar date={date} employee={employee} onDateChange={setDate} onEmployeeChange={setEmployee} onShiftOrderChange={setShiftOrder} onStatusChange={setStatus} shiftOrder={shiftOrder} status={status} />
        <ShiftSummaryCards assignedEmployees={assignedEmployees} attendanceMissing={filteredRecords.filter((record) => record.state === 'attendance-missing').length} totalRecords={filteredRecords.length} unassignedRecords={filteredRecords.filter((record) => record.state === 'unassigned').length} />
        <ShiftRecordsTable isAdminView={isAdminView} onView={openDrawer} records={filteredRecords} />
      </div>
      <ShiftRecordDrawer key={isDrawerOpen ? selectedRecord?.id ?? 'new' : 'closed'} onClose={() => setIsDrawerOpen(false)} onSave={(record) => { setRecords((current) => current.some((item) => item.id === record.id) ? current.map((item) => item.id === record.id ? record : item) : [...current, record]); setIsDrawerOpen(false) }} open={isDrawerOpen} record={selectedRecord} />
    </MainLayout>
  )
}
