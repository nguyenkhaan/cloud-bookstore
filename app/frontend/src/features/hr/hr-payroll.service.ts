import { privateClient } from '@/api/client'
import {
  PAYSLIP_DISPUTE_CATEGORY_LABELS,
  PAYSLIP_DISPUTE_STATUS_LABELS,
  formatIsoDateOnly,
  formatVietnamDate,
  formatVietnamDateTime,
  formatVietnamTime,
  formatVnd,
  numberToVietnameseWords,
  toIsoDateOnly,
} from './hr-payroll.utils'
import type {
  BatchPayoutInput,
  CreateNextAdjustmentInput,
  CreatePayslipDisputeInput,
  EmployeePayoutStatus,
  ListPayrollParams,
  ManualAdjustInput,
  NextPeriodAdjustmentRecord,
  PayrollAuditHistoryItem,
  PayrollBatchPayoutRecord,
  PayrollBreakdownData,
  PayrollBreakdownLine,
  PayrollCashVarianceItem,
  PayrollEmployeeRow,
  PayrollPeriodListItem,
  PayrollPeriodStatus,
  PayrollPeriodSummary,
  PayoutMethod,
  PayslipAdvanceVoucher,
  PayslipAttendanceDay,
  PayslipDetailDto,
  PayslipDisputeCategory,
  PayslipDisputeRecord,
  PayslipDisputeStatus,
  PayslipOvertimeEntry,
  PayslipPeriodOption,
  ZaloSendStatus,
} from './hr-payroll.type'

type QueryParams = ListPayrollParams & { status?: string; page?: number; pageSize?: number }

type RawRecord = Record<string, unknown>

function mapPeriodStatus(value: unknown): PayrollPeriodStatus {
  const normalized = String(value ?? '').trim().toUpperCase()
  switch (normalized) {
    case 'APPROVED_UNPAID':
      return 'approved_unpaid'
    case 'PARTIALLY_PAID':
      return 'partially_paid'
    case 'SETTLED':
      return 'settled'
    case 'DRAFT':
    default:
      return 'draft'
  }
}

function mapPayoutStatus(value: unknown): EmployeePayoutStatus {
  return String(value ?? '').trim().toUpperCase() === 'PAID' ? 'paid' : 'unpaid'
}

function mapPayoutMethod(value: unknown): PayoutMethod | undefined {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === 'BANK_TRANSFER') return 'bank_transfer'
  if (normalized === 'CASH') return 'cash'
  return undefined
}

function mapZaloStatus(value: unknown): ZaloSendStatus {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === 'SENT') return 'sent'
  if (normalized === 'FAILED') return 'failed'
  return 'unsent'
}

function mapDisputeCategory(value: unknown): PayslipDisputeCategory {
  const normalized = String(value ?? '').trim().toUpperCase()
  switch (normalized) {
    case 'BASE_SALARY':
      return 'base_salary'
    case 'OVERTIME':
      return 'overtime'
    case 'BONUS':
      return 'bonus'
    case 'DEDUCTION':
      return 'deduction'
    case 'ALLOWANCE':
    default:
      return 'allowance'
  }
}

function mapDisputeStatus(value: unknown): PayslipDisputeStatus {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === 'EXPLAINED') return 'explained'
  if (
    normalized === 'APPROVED_NEXT_PERIOD_ADJUSTMENT' ||
    normalized === 'APPROVED_NEXT_PERIOD'
  ) {
    return 'approved_next_period'
  }
  return 'pending_response'
}

function mapAdjustmentType(value: unknown): 'add_next_period' | 'deduct_next_period' {
  return String(value ?? '').trim().toUpperCase() === 'DEDUCT_NEXT_PERIOD'
    ? 'deduct_next_period'
    : 'add_next_period'
}

function mapAdjustmentStatus(value: unknown): 'draft' | 'approved' {
  const normalized = String(value ?? '').trim().toUpperCase()
  return normalized === 'APPROVED' || normalized === 'APPLIED' ? 'approved' : 'draft'
}

function mapLines(items: unknown): PayrollBreakdownLine[] {
  if (!Array.isArray(items)) return []
  return items.map((raw) => {
    const item = (raw ?? {}) as RawRecord
    return {
      label: String(item.label ?? ''),
      amount: Number(item.amount ?? 0),
      voucherCode: item.voucherCode ? String(item.voucherCode) : undefined,
    }
  })
}

export function mapPayrollPeriodListItem(raw: unknown): PayrollPeriodListItem {
  const item = (raw ?? {}) as RawRecord
  return {
    periodKey: String(item.periodKey ?? ''),
    payrollCode: String(item.payrollCode ?? ''),
    periodRangeLabel: String(item.periodRangeLabel ?? ''),
    status: mapPeriodStatus(item.status),
    exists: Boolean(item.exists),
    employeeCount: Number(item.employeeCount ?? 0),
    totalNetPay: Number(item.totalNetPay ?? 0),
    paidAmount: Number(item.paidAmount ?? 0),
  }
}

export function mapPayrollAdjustment(raw: unknown): NextPeriodAdjustmentRecord {
  const item = (raw ?? {}) as RawRecord
  const adjustmentCode = item.adjustmentCode ? String(item.adjustmentCode) : ''
  const proofUrl = item.proofUrl ? String(item.proofUrl) : undefined
  return {
    id: adjustmentCode || String(item.id ?? ''),
    sourcePayrollCode: String(item.sourcePayrollCode ?? ''),
    sourcePeriodKey: String(item.sourcePeriodKey ?? ''),
    sourceVoucherRef: String(item.sourceVoucherRef ?? ''),
    employeeId: String(item.employeeId ?? ''),
    employeeLabel: String(item.employeeLabel ?? ''),
    targetPeriodKey: String(item.targetPeriodKey ?? ''),
    category: String(item.category ?? ''),
    adjustmentType: mapAdjustmentType(item.adjustmentType),
    amount: Number(item.amount ?? 0),
    referenceCode: String(item.referenceCode ?? ''),
    reason: String(item.reason ?? ''),
    attachmentName: proofUrl ? 'Chứng từ đính kèm' : (item.attachmentName ? String(item.attachmentName) : undefined),
    status: mapAdjustmentStatus(item.status),
    createdAt: item.createdAt ? formatVietnamDateTime(String(item.createdAt)) : '-',
  }
}

export function mapPayrollPeriodDetail(raw: unknown): PayrollPeriodSummary {
  const data = (raw ?? {}) as RawRecord
  const rawKpi = (data.kpi ?? {}) as RawRecord
  const rawRows = Array.isArray(data.rows) ? data.rows : []
  const rawBatches = Array.isArray(data.batches) ? data.batches : []
  const rawHistory = Array.isArray(data.history) ? data.history : []
  const rawPending = Array.isArray(data.pendingAdjustments) ? data.pendingAdjustments : []

  const rows: PayrollEmployeeRow[] = rawRows.map((rawRow) => {
    const row = (rawRow ?? {}) as RawRecord
    const overtimeHours = Number(row.overtimeHours ?? 0)
    const hourlyRate = Number(row.hourlyRate ?? 0)
    return {
      id: String(row.employeeId ?? row.id ?? ''),
      entryId: row.entryId ? String(row.entryId) : undefined,
      employeeCode: String(row.employeeCode ?? ''),
      fullName: String(row.fullName ?? ''),
      roleLabel: String(row.roleLabel ?? ''),
      standardHours: Number(row.standardHours ?? 0),
      hourlyRate,
      baseSalary: Number(row.baseSalary ?? 0),
      overtimeHours,
      overtimeAmount: Number(row.overtimeAmount ?? 0),
      overtimeFormula: row.overtimeFormula
        ? String(row.overtimeFormula)
        : overtimeHours > 0
          ? `${overtimeHours} giờ × ${formatVnd(hourlyRate)} × 1,5`
          : '0 giờ',
      bonus: Number(row.bonus ?? 0),
      allowance: Number(row.allowance ?? 0),
      deduction: Number(row.deduction ?? 0),
      mandatoryContribution: Number(row.mandatoryContribution ?? 0),
      taxAmount: Number(row.taxAmount ?? 0),
      netPay: Number(row.netPay ?? 0),
      payoutStatus: mapPayoutStatus(row.payoutStatus),
      zaloStatus: mapZaloStatus(row.zaloStatus),
      zaloSentAt: row.zaloSentAt ? formatVietnamDateTime(String(row.zaloSentAt)) : undefined,
      zaloErrorReason: row.zaloErrorReason ? String(row.zaloErrorReason) : undefined,
      zaloLinked: Boolean(row.zaloLinked),
      bankAccount: String(row.bankAccount ?? ''),
      payoutDate: row.payoutAt
        ? formatVietnamDate(String(row.payoutAt))
        : row.payoutDate
          ? String(row.payoutDate)
          : undefined,
      payoutMethod: mapPayoutMethod(row.payoutMethod),
      transactionRef: row.transactionRef ? String(row.transactionRef) : undefined,
      bonusItems: mapLines(row.bonusItems),
      allowanceItems: mapLines(row.allowanceItems),
      deductionItems: mapLines(row.deductionItems),
      contributionNote: String(row.contributionNote ?? ''),
      cashVarianceReport: row.cashVarianceReport as PayrollEmployeeRow['cashVarianceReport'],
    }
  })

  const batches: PayrollBatchPayoutRecord[] = rawBatches.map((rawBatch) => {
    const batch = (rawBatch ?? {}) as RawRecord
    const proofUrl = batch.proofUrl ? String(batch.proofUrl) : undefined
    return {
      id: String(batch.id ?? ''),
      batchNumber: Number(batch.batchNumber ?? 0),
      method: mapPayoutMethod(batch.method) ?? 'bank_transfer',
      transactionRef: String(batch.transactionRef ?? ''),
      payoutDate: batch.payoutAt
        ? formatVietnamDate(String(batch.payoutAt))
        : String(batch.payoutDate ?? '-'),
      amount: Number(batch.amount ?? 0),
      employeeNames: Array.isArray(batch.employeeNames) ? batch.employeeNames.map(String) : [],
      note: batch.note ? String(batch.note) : undefined,
      attachmentName: proofUrl ? 'Chứng từ chi trả' : (batch.attachmentName ? String(batch.attachmentName) : undefined),
      confirmedBy: String(batch.confirmedByName ?? batch.confirmedBy ?? ''),
    }
  })

  const history: PayrollAuditHistoryItem[] = rawHistory.map((rawItem) => {
    const item = (rawItem ?? {}) as RawRecord
    return {
      id: String(item.id ?? ''),
      timestamp: item.occurredAt
        ? formatVietnamDateTime(String(item.occurredAt))
        : String(item.timestamp ?? '-'),
      actor: String(item.actorName ?? item.actor ?? ''),
      event: String(item.event ?? ''),
      result: String(item.result ?? ''),
    }
  })

  return {
    periodKey: String(data.periodKey ?? ''),
    payrollCode: String(data.payrollCode ?? ''),
    periodRangeLabel: String(data.periodRangeLabel ?? ''),
    attendanceSourceCode: String(data.attendanceSourceCode ?? ''),
    status: mapPeriodStatus(data.status),
    exists: typeof data.exists === 'boolean' ? data.exists : undefined,
    approvedAt: data.approvedAt ? formatVietnamDateTime(String(data.approvedAt)) : undefined,
    approvedDate: data.approvedAt
      ? formatVietnamDate(String(data.approvedAt))
      : data.approvedDate
        ? String(data.approvedDate)
        : undefined,
    approvedBy: data.approvedByName
      ? String(data.approvedByName)
      : data.approvedBy
        ? String(data.approvedBy)
        : undefined,
    payoutDate: data.payoutAt
      ? formatVietnamDate(String(data.payoutAt))
      : data.payoutDate
        ? String(data.payoutDate)
        : undefined,
    payoutMethod: mapPayoutMethod(data.payoutMethod),
    transactionRef: data.transactionRef ? String(data.transactionRef) : undefined,
    payoutConfirmedBy: data.payoutConfirmedByName
      ? String(data.payoutConfirmedByName)
      : data.payoutConfirmedBy
        ? String(data.payoutConfirmedBy)
        : undefined,
    kpi: {
      totalNetPay: Number(rawKpi.totalNetPay ?? 0),
      paidAmount: Number(rawKpi.paidAmount ?? 0),
      remainingAmount: Number(rawKpi.remainingAmount ?? 0),
      approvedOtHours: Number(rawKpi.approvedOtHours ?? 0),
      zaloSentCount: Number(rawKpi.zaloSentCount ?? 0),
      totalEmployees: Number(rawKpi.totalEmployees ?? 0),
      zaloUnsentCount: Number(rawKpi.zaloUnsentCount ?? 0),
      zaloFailedCount: Number(rawKpi.zaloFailedCount ?? 0),
    },
    rows,
    allRowsCount: Number(data.allRowsCount ?? rows.length),
    paidRowsCount: Number(data.paidRowsCount ?? 0),
    batches,
    history,
    pendingAdjustments: rawPending.map(mapPayrollAdjustment),
  }
}

export function mapPayslipDispute(raw: unknown): PayslipDisputeRecord {
  const item = (raw ?? {}) as RawRecord
  const category = mapDisputeCategory(item.category)
  const status = mapDisputeStatus(item.status)
  const proofUrl = item.proofUrl ? String(item.proofUrl) : undefined
  return {
    id: String(item.id ?? ''),
    disputeCode: item.disputeCode ? String(item.disputeCode) : undefined,
    payslipCode: String(item.payslipCode ?? ''),
    employeeId: item.employeeId ? String(item.employeeId) : undefined,
    employeeName: item.employeeName ? String(item.employeeName) : undefined,
    category,
    categoryLabel: item.categoryLabel ? String(item.categoryLabel) : PAYSLIP_DISPUTE_CATEGORY_LABELS[category],
    status,
    statusLabel: item.statusLabel ? String(item.statusLabel) : PAYSLIP_DISPUTE_STATUS_LABELS[status],
    content: String(item.content ?? ''),
    proofUrl,
    attachmentName: proofUrl ? 'Ảnh minh chứng' : (item.attachmentName ? String(item.attachmentName) : undefined),
    attachmentSize: item.attachmentSize ? String(item.attachmentSize) : undefined,
    submittedAt: item.submittedAt ? formatVietnamDateTime(String(item.submittedAt)) : '-',
    adminName: item.adminName ? String(item.adminName) : undefined,
    adminRole: item.adminRole ? String(item.adminRole) : undefined,
    respondedAt: item.respondedAt ? formatVietnamDateTime(String(item.respondedAt)) : undefined,
    adminResponse: item.adminResponse ? String(item.adminResponse) : undefined,
    calculationNote: item.calculationNote ? String(item.calculationNote) : undefined,
    adjustmentNote: item.adjustmentNote ? String(item.adjustmentNote) : undefined,
    linkedAdjustmentCode: item.linkedAdjustmentCode ? String(item.linkedAdjustmentCode) : undefined,
    ownedByActor: typeof item.ownedByActor === 'boolean' ? item.ownedByActor : undefined,
  }
}

export function mapPayslipDetail(raw: unknown): PayslipDetailDto {
  const data = (raw ?? {}) as RawRecord
  const hasPayslip = typeof data.hasPayslip === 'boolean'
    ? data.hasPayslip
    : Boolean(data.entryId || data.payslipCode)
  const entryId = data.entryId ? String(data.entryId) : null
  const netPay = Number(data.netPay ?? 0)
  const taxAmount = Number(data.taxAmount ?? 0)
  const approvedBy = String(data.approvedByName ?? data.approvedBy ?? '') || '-'
  const employeeCode = String(data.employeeCode ?? '')
  const employeeName = String(data.employeeName ?? '')

  const rawPeriods = Array.isArray(data.availablePeriods) ? data.availablePeriods : []
  const availablePeriods: PayslipPeriodOption[] = rawPeriods.map((rawPeriod) => {
    const p = (rawPeriod ?? {}) as RawRecord
    if (typeof p.paid === 'boolean') {
      const status = p.paid ? 'paid' : 'pending_payout'
      return {
        periodKey: String(p.periodKey ?? ''),
        status,
        statusShortLabel: p.paid ? 'Đã thanh toán' : 'Chờ thanh toán',
      }
    }
    const status = p.status === 'paid' ? 'paid' : 'pending_payout'
    return {
      periodKey: String(p.periodKey ?? ''),
      status,
      statusShortLabel: String(p.statusShortLabel ?? (status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán')),
    }
  })

  const rawAttendance = Array.isArray(data.attendanceDays) ? data.attendanceDays : []
  const attendanceDays: PayslipAttendanceDay[] = rawAttendance.map((rawDay) => {
    const d = (rawDay ?? {}) as RawRecord
    const checkInOut = d.checkInOut
      ? String(d.checkInOut)
      : d.checkInAt || d.checkOutAt
        ? `${d.checkInAt ? formatVietnamTime(String(d.checkInAt)) : '--:--'} - ${d.checkOutAt ? formatVietnamTime(String(d.checkOutAt)) : '--:--'}`
        : d.shiftNo
          ? `Ca ${String(d.shiftNo)} · Chưa chấm công`
          : '-'
    return {
      date: d.workDate ? formatIsoDateOnly(String(d.workDate)) : String(d.date ?? '-'),
      checkInOut,
      standardHours: Number(d.standardHours ?? 0),
      otHours: Number(d.overtimeHours ?? d.otHours ?? 0),
    }
  })

  const rawOvertime = Array.isArray(data.overtimeEntries) ? data.overtimeEntries : []
  const overtimeEntries: PayslipOvertimeEntry[] = rawOvertime.map((rawOt) => {
    const ot = (rawOt ?? {}) as RawRecord
    const timeRange = ot.timeRange
      ? String(ot.timeRange)
      : ot.startAt || ot.endAt
        ? `${ot.startAt ? formatVietnamTime(String(ot.startAt)) : '--:--'} - ${ot.endAt ? formatVietnamTime(String(ot.endAt)) : '--:--'}`
        : '-'
    return {
      date: ot.workDate ? formatIsoDateOnly(String(ot.workDate)) : String(ot.date ?? '-'),
      timeRange,
      hours: Number(ot.hours ?? 0),
      amount: Number(ot.amount ?? 0),
    }
  })

  let advanceVoucher: PayslipAdvanceVoucher | undefined
  let advanceVoucherCode = data.advanceVoucherCode ? String(data.advanceVoucherCode) : ''
  if (Array.isArray(data.advanceVouchers) && data.advanceVouchers.length > 0) {
    const first = (data.advanceVouchers[0] ?? {}) as RawRecord
    const code = String(first.voucherCode ?? '')
    advanceVoucherCode = advanceVoucherCode || code
    advanceVoucher = {
      voucherCode: code,
      employeeLabel: `${employeeName}${employeeCode ? ` · ${employeeCode}` : ''}`,
      amount: Number(first.amount ?? 0),
      receivedDate: first.createdAt ? formatVietnamDate(String(first.createdAt)) : '-',
      payoutMethod: 'Khấu trừ lương kỳ',
      approverLabel: approvedBy,
      content: String(first.content ?? ''),
      attachmentName: '-',
      footnote: '',
    }
  } else if (data.advanceVoucher && typeof data.advanceVoucher === 'object') {
    advanceVoucher = data.advanceVoucher as PayslipAdvanceVoucher
    advanceVoucherCode = advanceVoucherCode || advanceVoucher.voucherCode || ''
  }

  const rawDisputes = Array.isArray(data.disputes) ? data.disputes : []
  const payoutStatus: 'paid' | 'pending_payout' = typeof data.paid === 'boolean'
    ? (data.paid ? 'paid' : 'pending_payout')
    : data.payoutStatus === 'paid'
      ? 'paid'
      : 'pending_payout'

  return {
    hasPayslip,
    entryId,
    payslipCode: String(data.payslipCode ?? ''),
    periodKey: String(data.periodKey ?? ''),
    periodRange: String(data.periodRange ?? ''),
    payrollCode: String(data.payrollCode ?? ''),
    attendanceSourceCode: String(data.attendanceSourceCode ?? ''),
    payrollStatus: mapPeriodStatus(data.payrollStatus),
    payoutStatus,
    payoutDate: data.payoutAt
      ? formatVietnamDate(String(data.payoutAt))
      : data.payoutDate
        ? String(data.payoutDate)
        : undefined,
    expectedPayoutDate: data.expectedPayoutDate ? String(data.expectedPayoutDate) : undefined,
    approvedBy,
    approvedAt: data.approvedAt ? formatVietnamDateTime(String(data.approvedAt)) : '-',
    employeeId: String(data.employeeId ?? ''),
    employeeCode,
    employeeName,
    employeeRoleLabel: String(data.employeeRoleLabel ?? ''),
    storeName: String(data.storeName ?? ''),
    bankAccount: String(data.bankAccount ?? ''),
    transactionRef: data.transactionRef ? String(data.transactionRef) : undefined,
    standardHours: Number(data.standardHours ?? 0),
    hourlyRate: Number(data.hourlyRate ?? 0),
    baseSalary: Number(data.baseSalary ?? 0),
    overtimeHours: Number(data.overtimeHours ?? 0),
    overtimeAmount: Number(data.overtimeAmount ?? 0),
    bonus: Number(data.bonus ?? 0),
    bonusNote: String(data.bonusNote ?? ''),
    allowance: Number(data.allowance ?? 0),
    allowanceNote: String(data.allowanceNote ?? ''),
    mandatoryContribution: Number(data.mandatoryContribution ?? 0),
    mandatoryContributionNote: String(data.mandatoryContributionNote ?? ''),
    taxAmount,
    taxNote: data.taxNote
      ? String(data.taxNote)
      : taxAmount > 0
        ? 'Đã khấu trừ theo quy định'
        : 'Không phát sinh',
    deduction: Number(data.deduction ?? 0),
    advanceVoucherCode,
    totalIncome: Number(data.totalIncome ?? 0),
    totalDeduction: Number(data.totalDeduction ?? 0),
    netPay,
    netPayInWords: data.netPayInWords ? String(data.netPayInWords) : numberToVietnameseWords(netPay),
    zaloStatus: mapZaloStatus(data.zaloStatus),
    zaloSentAt: data.zaloSentAt ? formatVietnamDateTime(String(data.zaloSentAt)) : undefined,
    zaloLinked: Boolean(data.zaloLinked),
    availablePeriods,
    attendanceDays,
    overtimeEntries,
    advanceVoucher,
    disputes: rawDisputes.map(mapPayslipDispute),
  }
}

export function mapPayrollBreakdown(raw: unknown): PayrollBreakdownData {
  const data = (raw ?? {}) as RawRecord
  const rawVariances = Array.isArray(data.cashVariances) ? data.cashVariances : []
  const cashVariances: PayrollCashVarianceItem[] = rawVariances.map((rawVar) => {
    const v = (rawVar ?? {}) as RawRecord
    return {
      cashSessionId: String(v.cashSessionId ?? ''),
      voucherCode: String(v.voucherCode ?? ''),
      openedAt: v.openedAt ? formatVietnamDateTime(String(v.openedAt)) : '-',
      closedAt: v.closedAt ? formatVietnamDateTime(String(v.closedAt)) : undefined,
      expectedAmount: v.expectedAmount != null ? Number(v.expectedAmount) : undefined,
      countedAmount: v.countedAmount != null ? Number(v.countedAmount) : undefined,
      difference: Number(v.difference ?? 0),
      varianceNote: v.varianceNote ? String(v.varianceNote) : undefined,
      approverName: v.approverName ? String(v.approverName) : undefined,
    }
  })

  return {
    entryId: String(data.entryId ?? ''),
    employeeId: String(data.employeeId ?? ''),
    bonusItems: mapLines(data.bonusItems),
    allowanceItems: mapLines(data.allowanceItems),
    deductionItems: mapLines(data.deductionItems),
    cashVariances,
  }
}

export async function listPayrollPeriods(): Promise<PayrollPeriodListItem[]> {
  const { data } = await privateClient.get<unknown[]>('/hr/payroll/periods')
  return Array.isArray(data) ? data.map(mapPayrollPeriodListItem) : []
}

export async function listPayrollPeriod(params: ListPayrollParams = {}): Promise<PayrollPeriodSummary> {
  const { data } = await privateClient.get<unknown>(`/hr/payroll/periods/${encodeURIComponent(params.periodKey ?? '')}`, {
    params: {
      page: 1,
      pageSize: 200,
      search: params.search || undefined,
      status: params.statusFilter ? params.statusFilter.toUpperCase() : undefined,
      payoutFilter: params.payoutFilter || undefined,
    } satisfies QueryParams,
  })
  return mapPayrollPeriodDetail(data)
}

export async function initializePayrollFromAttendance(periodKey: string, _actorName?: string): Promise<PayrollPeriodSummary> {
  const { data } = await privateClient.post<unknown>(`/hr/payroll/periods/${encodeURIComponent(periodKey)}/initialize`)
  return mapPayrollPeriodDetail(data)
}

export async function adjustDraftPayrollEmployee(input: ManualAdjustInput, _actorName?: string): Promise<PayrollPeriodSummary> {
  const { data } = await privateClient.patch<unknown>(
    `/hr/payroll/periods/${encodeURIComponent(input.periodKey)}/employees/${input.employeeId}`,
    { bonus: input.bonus, allowance: input.allowance, deduction: input.deduction, note: input.note },
  )
  return mapPayrollPeriodDetail(data)
}

export async function approveAndLockPayroll(periodKey: string, _actorName?: string): Promise<PayrollPeriodSummary> {
  const { data } = await privateClient.post<unknown>(`/hr/payroll/periods/${encodeURIComponent(periodKey)}/approve`)
  return mapPayrollPeriodDetail(data)
}

export async function unlockPayrollPeriod(periodKey: string, reason: string, _actorName?: string): Promise<PayrollPeriodSummary> {
  const { data } = await privateClient.post<unknown>(`/hr/payroll/periods/${encodeURIComponent(periodKey)}/unlock`, { reason })
  return mapPayrollPeriodDetail(data)
}

export async function executeBatchPayout(input: BatchPayoutInput): Promise<PayrollPeriodSummary> {
  const transactionRef =
    input.method === 'cash' ? undefined : input.transactionRef.trim() || undefined
  const { data } = await privateClient.post<unknown>(`/hr/payroll/periods/${encodeURIComponent(input.periodKey)}/payouts`, {
    employeeIds: input.employeeIds,
    method: input.method.toUpperCase(),
    transactionRef,
    payoutDate: toIsoDateOnly(input.payoutDate),
    note: input.note,
    proofUpload: input.proofUpload ?? undefined,
  })
  return mapPayrollPeriodDetail(data)
}

export async function sendPayrollZaloPayslips(periodKey: string, employeeIds: string[], _actorName?: string): Promise<unknown> {
  const { data } = await privateClient.post<unknown>(`/hr/payroll/periods/${encodeURIComponent(periodKey)}/send-zalo`, { employeeIds })
  return data
}

export async function listNextPeriodAdjustments(periodKey?: string): Promise<NextPeriodAdjustmentRecord[]> {
  const { data } = await privateClient.get<unknown[]>('/hr/payroll/adjustments', { params: { periodKey } })
  return Array.isArray(data) ? data.map(mapPayrollAdjustment) : []
}

export async function createNextPeriodAdjustment(input: CreateNextAdjustmentInput): Promise<NextPeriodAdjustmentRecord> {
  const { data } = await privateClient.post<unknown>('/hr/payroll/adjustments', {
    employeeId: input.employeeId,
    sourcePeriodKey: input.sourcePeriodKey || undefined,
    sourceVoucherRef: input.sourceVoucherRef || undefined,
    targetPeriodKey: input.targetPeriodKey,
    category: input.category,
    adjustmentType: input.adjustmentType.toUpperCase(),
    amount: input.amount,
    referenceCode: input.referenceCode || undefined,
    reason: input.reason,
    mode: input.mode.toUpperCase(),
    proofUpload: input.proofUpload ?? undefined,
  })
  return mapPayrollAdjustment(data)
}

export async function getPayrollBreakdown(periodKey: string, employeeId: string): Promise<PayrollBreakdownData> {
  const { data } = await privateClient.get<unknown>(`/hr/payroll/periods/${encodeURIComponent(periodKey)}/employees/${employeeId}/breakdown`)
  return mapPayrollBreakdown(data)
}

export async function getMyPayslipDetail(periodKey?: string): Promise<PayslipDetailDto> {
  const { data } = await privateClient.get<unknown>('/hr/payslips/me', {
    params: { periodKey: periodKey || undefined },
  })
  return mapPayslipDetail(data)
}

export async function getEmployeePayslipDetail(employeeId: string, periodKey?: string): Promise<PayslipDetailDto> {
  const { data } = await privateClient.get<unknown>(`/hr/payslips/${employeeId}`, {
    params: { periodKey: periodKey || undefined },
  })
  return mapPayslipDetail(data)
}

export async function getPayslipDetail(employeeId: string, periodKey: string): Promise<PayslipDetailDto> {
  return getEmployeePayslipDetail(employeeId, periodKey)
}

export async function createPayslipDispute(input: CreatePayslipDisputeInput): Promise<PayslipDisputeRecord> {
  const targetEntryId = input.entryId || input.employeeId
  const { data } = await privateClient.post<unknown>(`/hr/payslips/${targetEntryId}/disputes`, {
    category: input.category.toUpperCase(),
    content: input.content,
    proofUpload: input.proofUpload ?? undefined,
  })
  return mapPayslipDispute(data)
}

export async function respondPayslipDispute(disputeId: string, input: Record<string, unknown>): Promise<PayslipDisputeRecord> {
  const { data } = await privateClient.post<unknown>(`/hr/payslips/disputes/${disputeId}/respond`, input)
  return mapPayslipDispute(data)
}

export async function resendSinglePayslipZalo(entryId: string, _periodKey?: string): Promise<{ sentAt?: string }> {
  const { data } = await privateClient.post<{ sentAt?: string | null }>(`/hr/payslips/${entryId}/resend-zalo`)
  return {
    sentAt: data?.sentAt ? formatVietnamDateTime(data.sentAt) : undefined,
  }
}
