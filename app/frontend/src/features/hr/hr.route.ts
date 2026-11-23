const hrRoot = '/hr'

export const hrPaths = {
  root: hrRoot,
  employees: `${hrRoot}/employees`,
  employeeDetail: (id: string) => `${hrRoot}/employees/${id}`,
  shifts: `${hrRoot}/shifts`,
  attendance: `${hrRoot}/attendance`,
  personalAttendance: `${hrRoot}/attendance/personal`,
  requests: `${hrRoot}/requests`,
  payroll: `${hrRoot}/payroll`,
  payrollAdjustmentNew: `${hrRoot}/payroll/adjustments/new`,
  payslip: `${hrRoot}/payslip`,
  payslipDetail: (employeeId: string) => `${hrRoot}/payslip/${employeeId}`,
} as const
