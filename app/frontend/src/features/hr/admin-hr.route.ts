const adminHrRoot = '/admin/hr'

export const adminHrPaths = {
  root: adminHrRoot,
  attendance: `${adminHrRoot}/attendance`,
  shifts: `${adminHrRoot}/shifts`,
} as const
