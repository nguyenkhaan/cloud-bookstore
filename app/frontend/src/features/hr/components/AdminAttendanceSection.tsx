import { useMemo, useState } from 'react'
import { attendanceDateLabel, attendanceDemoDate, attendanceRows } from '../attendance.data'
import type { AttendanceRowDisplay } from '../hr-shift.type'
import { AttendanceAdjustmentDialog } from './AttendanceAdjustmentDialog'
import { AttendanceFilters, type AttendanceStatusFilter, type PayrollFilter } from './AttendanceFilters'
import { AttendanceSummaryCards } from './AttendanceSummaryCards'
import { AttendanceTable } from './AttendanceTable'

export function AdminAttendanceSection() {
  const [rows, setRows] = useState(attendanceRows)
  const [date, setDate] = useState(attendanceDemoDate)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<AttendanceStatusFilter>('all')
  const [payroll, setPayroll] = useState<PayrollFilter>('all')
  const [selectedRow, setSelectedRow] = useState<AttendanceRowDisplay>()
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const selectedDateLabel = attendanceDateLabel(date)

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (row.workDate !== selectedDateLabel) return false
        const normalizedQuery = query.trim().toLocaleLowerCase()
        if (
          normalizedQuery &&
          !`${row.employeeId} ${row.employeeName}`.toLocaleLowerCase().includes(normalizedQuery)
        ) {
          return false
        }
        if (status !== 'all' && row.state !== status) return false
        if (payroll !== 'all' && row.payrollStatus !== payroll) return false
        return true
      }),
    [payroll, query, rows, selectedDateLabel, status],
  )

  const openAdjustment = (row: AttendanceRowDisplay) => {
    setSelectedRow(row)
    setIsAdjustmentOpen(true)
  }

  return (
    <>
      <div className="space-y-5" data-testid="attendance-admin-section">
        <AttendanceSummaryCards
          absent={filteredRows.filter((row) => row.state === 'absent').length}
          late={filteredRows.filter((row) => row.state === 'late').length}
          missing={filteredRows.filter((row) => row.state === 'missing-attendance').length}
          present={filteredRows.filter((row) => row.state === 'present').length}
        />
        <AttendanceFilters
          date={date}
          onDateChange={setDate}
          onPayrollChange={setPayroll}
          onQueryChange={setQuery}
          onStatusChange={setStatus}
          payroll={payroll}
          query={query}
          status={status}
        />
        <AttendanceTable onAdjust={openAdjustment} rows={filteredRows} />
      </div>
      <AttendanceAdjustmentDialog
        key={isAdjustmentOpen ? selectedRow?.id ?? 'new' : 'closed'}
        onClose={() => setIsAdjustmentOpen(false)}
        onSubmit={(reason) => {
          if (selectedRow) {
            setRows((current) =>
              current.map((row) =>
                row.id === selectedRow.id
                  ? { ...row, state: 'adjustment-pending', adjustmentReason: reason }
                  : row,
              ),
            )
          }
          setIsAdjustmentOpen(false)
        }}
        open={isAdjustmentOpen}
        row={selectedRow}
      />
    </>
  )
}
