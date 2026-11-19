export type ShiftRecordUiState = 'assigned' | 'unassigned' | 'attendance-missing'

export type AttendanceUiState =
  | 'present'
  | 'late'
  | 'absent'
  | 'missing-attendance'
  | 'adjustment-pending'

export type PayrollPaymentStatus = 'paid' | 'unpaid'

export type ShiftRecordDisplay = {
  id: string
  workDate: string
  employeeId?: string
  employeeName?: string
  shiftOrder: string
  timeRange: string
  state: ShiftRecordUiState
  note?: string
}

export type AttendanceRowDisplay = {
  id: string
  employeeId: string
  employeeName: string
  workDate: string
  shiftOrder: string
  checkIn?: string
  checkOut?: string
  workedHours?: number
  state: AttendanceUiState
  payrollStatus: PayrollPaymentStatus
  shiftPay: number
  adjustmentReason?: string
}
