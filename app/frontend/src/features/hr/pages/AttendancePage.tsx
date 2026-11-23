import { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/common'
import { AuthContext } from '@/context/AuthProvider'
import { MainLayout } from '@/components/layout'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { attendanceDateLabel, attendanceDemoDate, attendanceDemoPunchFor, attendanceRows } from '../attendance.data'
import { AdminAttendanceSection } from '../components/AdminAttendanceSection'
import { AttendanceCard } from '../components/AttendanceCard'
import { AttendanceDateFilter } from '../components/AttendanceDateFilter'
import { hrPaths } from '../hr.route'

type AttendancePageProps = {
  personalOnly?: boolean
}

export default function AttendancePage({ personalOnly = false }: AttendancePageProps) {
  const navigate = useNavigate()
  const auth = useContext(AuthContext)
  const currentUser = auth?.session?.user ?? { name: 'Khách', role: 'Thu ngân', roleCode: undefined }
  const isAdminView =
    currentUser.roleCode === 'ADMIN' &&
    !personalOnly

  const [rows, setRows] = useState(attendanceRows)
  const [date, setDate] = useState(attendanceDemoDate)
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)
  const currentEmployeeId = rows.find((row) => row.employeeName === currentUser.name)?.employeeId ?? 'NV-0002'
  const selectedDateLabel = attendanceDateLabel(date)
  const isHistorical = date !== attendanceDemoDate

  const employeeRows = useMemo(
    () => rows.filter((row) => row.employeeId === currentEmployeeId && row.workDate === selectedDateLabel),
    [currentEmployeeId, rows, selectedDateLabel],
  )

  const updateRow = (id: string, update: Partial<(typeof rows)[number]>) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...update } : row))
  }

  return (
    <MainLayout
      actionButton={isAdminView ? <Button onClick={() => undefined} size="sm" variant="secondary">Xuất danh sách</Button> : undefined}
      breadcrumbs={[{ label: 'Không gian làm việc' }, { label: 'Nhân sự & tiền lương', to: hrPaths.root }, { label: 'Chấm công' }]}
      currentPath="hr"
      onNavigate={(item) => { const path = workspacePathFor(item); if (path) navigate(path) }}
      onSignOut={auth?.signOut}
      pageTitle={isAdminView ? 'Chấm công & Lương ca' : 'Điểm danh & Chấm công theo ca'}
      user={currentUser}
    >
      {isAdminView ? (
        <AdminAttendanceSection />
      ) : (
        <div className="space-y-5" data-testid="attendance-employee-section">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Theo dõi các ca làm của bạn</p>
            </div>
            <AttendanceDateFilter date={date} onChange={setDate} />
          </div>

          {employeeRows.length > 0 ? (
            <div className="space-y-4">
              {employeeRows.map((row) => (
                <AttendanceCard
                  isHistorical={isHistorical}
                  key={row.id}
                  onCheckIn={() => updateRow(row.id, { checkIn: attendanceDemoPunchFor(row).checkIn, state: 'missing-attendance' })}
                  onCheckOut={() => updateRow(row.id, { checkOut: attendanceDemoPunchFor(row).checkOut, workedHours: attendanceDemoPunchFor(row).workedHours, state: 'present' })}
                  onExplain={() => setIsExplanationOpen(true)}
                  row={row}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm font-semibold text-slate-800">Không có ca điểm danh trong ngày đã chọn</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Hãy chọn một ngày khác để xem lại lịch sử chấm công của bạn.</p>
            </div>
          )}

          {isExplanationOpen && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800" role="status">
              UI demo: yêu cầu giải trình đã được ghi nhận để Admin xem xét.
              <button className="ml-2 font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600" onClick={() => setIsExplanationOpen(false)} type="button">Đóng</button>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  )
}
