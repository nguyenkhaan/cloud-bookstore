import type { AttendanceRowDisplay } from './hr-shift.type'

export const attendanceDemoDate = '2026-10-18'
export const attendanceDemoDateLabel = '18/10/2026'

export const attendanceRows: AttendanceRowDisplay[] = [
  { id: 'attendance-001', employeeId: 'NV-0002', employeeName: 'Trần Hoàng Phong', workDate: attendanceDemoDateLabel, shiftOrder: 'Ca sáng', timeRange: '08:00–13:00', counterName: 'Quầy 01', checkIn: '07:58', checkOut: '13:01', workedHours: 5, state: 'present', payrollStatus: 'paid', shiftPay: 250000 },
  { id: 'attendance-002', employeeId: 'NV-0002', employeeName: 'Trần Hoàng Phong', workDate: attendanceDemoDateLabel, shiftOrder: 'Ca chiều', timeRange: '13:00–18:00', counterName: 'Quầy 01', state: 'missing-attendance', payrollStatus: 'unpaid', shiftPay: 250000 },
  { id: 'attendance-003', employeeId: 'NV-0003', employeeName: 'Lê Minh Khoa', workDate: attendanceDemoDateLabel, shiftOrder: 'Ca chiều', timeRange: '13:00–18:00', counterName: 'Quầy 02', checkIn: '13:10', checkOut: '18:00', workedHours: 4.8, state: 'late', payrollStatus: 'unpaid', shiftPay: 250000 },
  { id: 'attendance-004', employeeId: 'NV-0004', employeeName: 'Nguyễn Thanh Tâm', workDate: attendanceDemoDateLabel, shiftOrder: 'Ca tối', timeRange: '18:00–22:30', counterName: 'Quầy 01', state: 'absent', payrollStatus: 'unpaid', shiftPay: 280000 },
  { id: 'attendance-005', employeeId: 'NV-0005', employeeName: 'Lê Mai Linh', workDate: attendanceDemoDateLabel, shiftOrder: 'Ca sáng', timeRange: '08:00–13:00', counterName: 'Quầy 02', checkIn: '08:03', state: 'missing-attendance', payrollStatus: 'unpaid', shiftPay: 250000 },
  { id: 'attendance-006', employeeId: 'NV-0006', employeeName: 'Nguyễn Hoài An', workDate: attendanceDemoDateLabel, shiftOrder: 'Ca chiều', timeRange: '13:00–18:00', counterName: 'Quầy 02', checkIn: '13:00', checkOut: '18:00', workedHours: 5, state: 'adjustment-pending', payrollStatus: 'unpaid', shiftPay: 250000, adjustmentReason: 'Bổ sung chứng từ check-out.' },
  { id: 'attendance-007', employeeId: 'NV-0002', employeeName: 'Trần Hoàng Phong', workDate: '17/10/2026', shiftOrder: 'Ca sáng', timeRange: '08:00–13:00', counterName: 'Quầy 01', checkIn: '08:01', checkOut: '13:00', workedHours: 4.9, state: 'present', payrollStatus: 'paid', shiftPay: 250000 },
]

const demoPunchesByShift = {
  'Ca sáng': { checkIn: '08:05', checkOut: '13:00', workedHours: 4.9 },
  'Ca chiều': { checkIn: '13:05', checkOut: '18:00', workedHours: 4.9 },
  'Ca tối': { checkIn: '18:05', checkOut: '22:30', workedHours: 4.4 },
} as const

export function attendanceDemoPunchFor(row: AttendanceRowDisplay) {
  return demoPunchesByShift[row.shiftOrder as keyof typeof demoPunchesByShift] ?? demoPunchesByShift['Ca sáng']
}

export function attendanceDateLabel(date: string) {
  return date === attendanceDemoDate ? attendanceDemoDateLabel : date.split('-').reverse().join('/')
}
