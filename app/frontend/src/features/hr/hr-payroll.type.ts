export type PayrollPeriodStatus =
  | 'draft'
  | 'approved_unpaid'
  | 'partially_paid'
  | 'settled'

export type PayoutMethod = 'bank_transfer' | 'cash'
export type EmployeePayoutStatus = 'paid' | 'unpaid'
export type ZaloSendStatus = 'sent' | 'unsent' | 'failed'

export type PayslipDisputeStatus =
  | 'pending_response'
  | 'explained'
  | 'approved_next_period'

export type PayslipDisputeCategory =
  | 'base_salary'
  | 'overtime'
  | 'bonus'
  | 'allowance'
  | 'deduction'

export interface PayrollBreakdownLine {
  label: string
  amount: number
  voucherCode?: string
}

export interface CashVarianceReport {
  voucherCode: string
  shiftLabel: string
  reconciliationResult: string
  employeeLabel: string
  initialDifference: string
  verifiedCause: string
  resolutionNote: string
  approverName: string
  approverRole: string
  approvedAt: string
  payrollImpact: string
  internalDeductionNote: string
}

export interface PayrollEmployeeRow {
  id: string
  employeeCode: string
  fullName: string
  roleLabel: string
  standardHours: number
  hourlyRate: number
  baseSalary: number
  overtimeHours: number
  overtimeAmount: number
  overtimeFormula: string
  bonus: number
  allowance: number
  deduction: number
  mandatoryContribution: number
  taxAmount: number
  netPay: number
  payoutStatus: EmployeePayoutStatus
  zaloStatus: ZaloSendStatus
  zaloSentAt?: string
  zaloErrorReason?: string
  zaloLinked: boolean
  bankAccount: string
  payoutDate?: string
  payoutMethod?: PayoutMethod
  transactionRef?: string
  bonusItems: PayrollBreakdownLine[]
  allowanceItems: PayrollBreakdownLine[]
  deductionItems: PayrollBreakdownLine[]
  contributionNote: string
  cashVarianceReport?: CashVarianceReport
}

export interface PayrollAuditHistoryItem {
  id: string
  timestamp: string
  actor: string
  event: string
  result: string
}

export interface PayrollBatchPayoutRecord {
  id: string
  batchNumber: number
  method: PayoutMethod
  transactionRef: string
  payoutDate: string
  amount: number
  employeeNames: string[]
  note?: string
  attachmentName?: string
  confirmedBy: string
}

export interface PayrollPeriodRecord {
  periodKey: string
  payrollCode: string
  periodRangeLabel: string
  attendanceSourceCode: string
  status: PayrollPeriodStatus
  approvedDate?: string
  approvedAt?: string
  approvedBy?: string
  payoutDate?: string
  payoutMethod?: PayoutMethod
  transactionRef?: string
  payoutConfirmedBy?: string
  rows: PayrollEmployeeRow[]
  batches: PayrollBatchPayoutRecord[]
  history: PayrollAuditHistoryItem[]
}

export interface PayrollPeriodSummary {
  periodKey: string
  payrollCode: string
  periodRangeLabel: string
  attendanceSourceCode: string
  status: PayrollPeriodStatus
  approvedDate?: string
  approvedAt?: string
  approvedBy?: string
  payoutDate?: string
  payoutMethod?: PayoutMethod
  transactionRef?: string
  payoutConfirmedBy?: string
  kpi: {
    totalNetPay: number
    paidAmount: number
    remainingAmount: number
    approvedOtHours: number
    zaloSentCount: number
    totalEmployees: number
    zaloUnsentCount: number
    zaloFailedCount: number
  }
  rows: PayrollEmployeeRow[]
  allRowsCount: number
  paidRowsCount: number
  batches: PayrollBatchPayoutRecord[]
  history: PayrollAuditHistoryItem[]
}

export interface ListPayrollParams {
  periodKey?: string
  search?: string
  statusFilter?: PayrollPeriodStatus | ''
  payoutFilter?: EmployeePayoutStatus | 'partial' | ''
}

export interface ManualAdjustInput {
  periodKey: string
  employeeId: string
  bonus: number
  allowance: number
  deduction: number
  note?: string
}

export interface BatchPayoutInput {
  periodKey: string
  employeeIds: string[]
  method: PayoutMethod
  transactionRef: string
  payoutDate: string
  note?: string
  attachmentName?: string
  actorName: string
}

export interface NextPeriodAdjustmentRecord {
  id: string
  sourcePayrollCode: string
  sourcePeriodKey: string
  sourceVoucherRef: string
  employeeId: string
  employeeLabel: string
  targetPeriodKey: string
  category: string
  adjustmentType: 'add_next_period' | 'deduct_next_period'
  amount: number
  referenceCode: string
  reason: string
  attachmentName?: string
  status: 'draft' | 'approved'
  createdAt: string
}

export interface CreateNextAdjustmentInput {
  sourcePayrollCode: string
  sourcePeriodKey: string
  sourceVoucherRef: string
  employeeId: string
  targetPeriodKey: string
  category: string
  adjustmentType: 'add_next_period' | 'deduct_next_period'
  amount: number
  referenceCode?: string
  reason: string
  attachmentName?: string
  mode: 'draft' | 'approved'
}

export interface PayslipAttendanceDay {
  date: string
  checkInOut: string
  standardHours: number
  otHours: number
}

export interface PayslipOvertimeEntry {
  date: string
  timeRange: string
  hours: number
  amount: number
}

export interface PayslipAdvanceVoucher {
  voucherCode: string
  employeeLabel: string
  amount: number
  receivedDate: string
  payoutMethod: string
  approverLabel: string
  content: string
  attachmentName: string
  footnote: string
}

export interface PayslipDisputeRecord {
  id: string
  payslipCode: string
  category: PayslipDisputeCategory
  categoryLabel: string
  status: PayslipDisputeStatus
  statusLabel: string
  content: string
  attachmentName?: string
  attachmentSize?: string
  submittedAt: string
  adminName?: string
  adminRole?: string
  respondedAt?: string
  adminResponse?: string
  calculationNote?: string
  adjustmentNote?: string
}

export interface PayslipPeriodOption {
  periodKey: string
  status: 'paid' | 'pending_payout'
  statusShortLabel: string
}

export interface PayslipDetailDto {
  payslipCode: string
  periodKey: string
  periodRange: string
  payrollCode: string
  attendanceSourceCode: string
  payrollStatus: PayrollPeriodStatus
  payoutStatus: 'paid' | 'pending_payout'
  payoutDate?: string
  expectedPayoutDate?: string
  approvedBy: string
  approvedAt: string
  employeeId: string
  employeeCode: string
  employeeName: string
  employeeRoleLabel: string
  storeName: string
  bankAccount: string
  transactionRef?: string
  standardHours: number
  hourlyRate: number
  baseSalary: number
  overtimeHours: number
  overtimeAmount: number
  bonus: number
  bonusNote: string
  allowance: number
  allowanceNote: string
  mandatoryContribution: number
  mandatoryContributionNote: string
  taxAmount: number
  taxNote: string
  deduction: number
  advanceVoucherCode: string
  totalIncome: number
  totalDeduction: number
  netPay: number
  netPayInWords: string
  zaloStatus: ZaloSendStatus
  zaloSentAt?: string
  zaloLinked: boolean
  availablePeriods: PayslipPeriodOption[]
  attendanceDays: PayslipAttendanceDay[]
  overtimeEntries: PayslipOvertimeEntry[]
  advanceVoucher: PayslipAdvanceVoucher
  disputes: PayslipDisputeRecord[]
}

export interface CreatePayslipDisputeInput {
  employeeId: string
  periodKey: string
  category: PayslipDisputeCategory
  content: string
  attachmentName?: string
  attachmentSize?: string
}
