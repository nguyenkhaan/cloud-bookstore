import {
  PAYSLIP_DISPUTE_CATEGORY_LABELS,
  PAYSLIP_DISPUTE_STATUS_LABELS,
  PAYSLIP_PERIOD_OPTIONS,
  PHONG_ADVANCE_VOUCHER_092026,
  PHONG_ATTENDANCE_DAYS_092026,
  PHONG_OVERTIME_ENTRIES_092026,
  createInitialPayrollPeriods,
  createInitialPayslipDisputes,
  formatVnd,
} from './hr-payroll.mock'
import type {
  BatchPayoutInput,
  CreateNextAdjustmentInput,
  CreatePayslipDisputeInput,
  ListPayrollParams,
  ManualAdjustInput,
  NextPeriodAdjustmentRecord,
  PayrollEmployeeRow,
  PayrollPeriodRecord,
  PayrollPeriodSummary,
  PayslipDetailDto,
  PayslipDisputeRecord,
} from './hr-payroll.type'

let payrollPeriodsStore: PayrollPeriodRecord[] = createInitialPayrollPeriods()
let nextAdjustmentsStore: NextPeriodAdjustmentRecord[] = []
let payslipDisputesStore: PayslipDisputeRecord[] = createInitialPayslipDisputes()

export function resetHrPayrollStore(): void {
  payrollPeriodsStore = createInitialPayrollPeriods()
  nextAdjustmentsStore = []
  payslipDisputesStore = createInitialPayslipDisputes()
}

function findPeriod(periodKey: string): PayrollPeriodRecord {
  const found = payrollPeriodsStore.find((item) => item.periodKey === periodKey)
  if (found) return found
  return payrollPeriodsStore[0]
}

function recalcRowNetPay(row: PayrollEmployeeRow): PayrollEmployeeRow {
  const baseSalary = row.standardHours * row.hourlyRate
  const overtimeAmount = Math.round(row.overtimeHours * row.hourlyRate * 1.5)
  const netPay =
    baseSalary +
    overtimeAmount +
    row.bonus +
    row.allowance -
    row.deduction -
    row.mandatoryContribution -
    row.taxAmount
  return {
    ...row,
    baseSalary,
    overtimeAmount,
    netPay,
  }
}

function formatCurrentTimestamp(): string {
  return '04/10/2026 · 10:30'
}

export async function listPayrollPeriod(
  params: ListPayrollParams = {},
): Promise<PayrollPeriodSummary> {
  const period = findPeriod(params.periodKey || '09/2026')
  const search = (params.search ?? '').trim().toLowerCase()

  const filteredRows = period.rows.filter((row) => {
    if (search) {
      const matchesSearch =
        row.fullName.toLowerCase().includes(search) ||
        row.employeeCode.toLowerCase().includes(search) ||
        row.roleLabel.toLowerCase().includes(search)
      if (!matchesSearch) return false
    }

    if (params.statusFilter === 'draft' && period.status !== 'draft') {
      return false
    }
    if (params.statusFilter === 'approved_unpaid' && period.status === 'draft') {
      return false
    }

    if (params.payoutFilter === 'paid' && row.payoutStatus !== 'paid') {
      return false
    }
    if (params.payoutFilter === 'unpaid' && row.payoutStatus !== 'unpaid') {
      return false
    }
    if (
      params.payoutFilter === 'partial' &&
      period.status !== 'partially_paid'
    ) {
      return false
    }

    return true
  })

  const totalNetPay = period.rows.reduce((sum, r) => sum + r.netPay, 0)
  const paidAmount = period.rows
    .filter((r) => r.payoutStatus === 'paid')
    .reduce((sum, r) => sum + r.netPay, 0)
  const remainingAmount = Math.max(0, totalNetPay - paidAmount)
  const approvedOtHours = period.rows.reduce((sum, r) => sum + r.overtimeHours, 0)
  const zaloSentCount = period.rows.filter((r) => r.zaloStatus === 'sent').length
  const zaloUnsentCount = period.rows.filter(
    (r) => r.zaloStatus === 'unsent',
  ).length
  const zaloFailedCount = period.rows.filter(
    (r) => r.zaloStatus === 'failed',
  ).length

  return {
    periodKey: period.periodKey,
    payrollCode: period.payrollCode,
    periodRangeLabel: period.periodRangeLabel,
    attendanceSourceCode: period.attendanceSourceCode,
    status: period.status,
    approvedDate: period.approvedDate,
    approvedAt: period.approvedAt,
    approvedBy: period.approvedBy,
    payoutDate: period.payoutDate,
    payoutMethod: period.payoutMethod,
    transactionRef: period.transactionRef,
    payoutConfirmedBy: period.payoutConfirmedBy,
    kpi: {
      totalNetPay,
      paidAmount,
      remainingAmount,
      approvedOtHours,
      zaloSentCount,
      totalEmployees: period.rows.length,
      zaloUnsentCount,
      zaloFailedCount,
    },
    rows: filteredRows.map((row) => ({ ...row })),
    allRowsCount: period.rows.length,
    paidRowsCount: period.rows.filter((r) => r.payoutStatus === 'paid').length,
    batches: [...period.batches],
    history: [...period.history],
  }
}

export async function initializePayrollFromAttendance(
  periodKey: string,
  actorName = 'Nguyễn Minh Anh',
): Promise<PayrollPeriodSummary> {
  const period = findPeriod(periodKey)
  if (period.status !== 'draft') {
    throw new Error('Chỉ có thể khởi tạo lại bảng lương khi đang ở trạng thái Bản nháp.')
  }

  period.history = [
    ...period.history,
    {
      id: `HIS-INIT-${Date.now()}`,
      timestamp: formatCurrentTimestamp(),
      actor: `${actorName} · Admin`,
      event: `Đồng bộ lại từ ${period.attendanceSourceCode}`,
      result: `${period.rows.length} nhân viên · ${formatVnd(
        period.rows.reduce((s, r) => s + r.netPay, 0),
      )}`,
    },
  ]

  return listPayrollPeriod({ periodKey: period.periodKey })
}

export async function adjustDraftPayrollEmployee(
  input: ManualAdjustInput,
  actorName = 'Nguyễn Minh Anh',
): Promise<PayrollPeriodSummary> {
  const period = findPeriod(input.periodKey)
  if (period.status !== 'draft') {
    throw new Error('Chỉ có thể điều chỉnh thủ công khi bảng lương đang ở Bản nháp.')
  }

  let updatedName = ''
  period.rows = period.rows.map((row) => {
    if (row.id !== input.employeeId) return row
    updatedName = row.fullName
    return recalcRowNetPay({
      ...row,
      bonus: Math.max(0, input.bonus),
      allowance: Math.max(0, input.allowance),
      deduction: Math.max(0, input.deduction),
      bonusItems: [{ label: input.note?.trim() || 'Điều chỉnh thưởng', amount: Math.max(0, input.bonus) }],
    })
  })

  if (updatedName) {
    period.history = [
      ...period.history,
      {
        id: `HIS-ADJ-${Date.now()}`,
        timestamp: formatCurrentTimestamp(),
        actor: `${actorName} · Admin`,
        event: `Điều chỉnh thủ công · ${updatedName}`,
        result: input.note?.trim() || 'Cập nhật khoản mục bản nháp',
      },
    ]
  }

  return listPayrollPeriod({ periodKey: period.periodKey })
}

export async function approveAndLockPayroll(
  periodKey: string,
  actorName = 'Nguyễn Minh Anh',
): Promise<PayrollPeriodSummary> {
  const period = findPeriod(periodKey)
  if (period.status !== 'draft') {
    throw new Error('Bảng lương đã được duyệt trước đó.')
  }

  period.status = 'approved_unpaid'
  period.approvedDate = '02/11/2026'
  period.approvedAt = '02/11/2026 · 14:20'
  period.approvedBy = actorName
  period.history = [
    ...period.history,
    {
      id: `HIS-LOCK-${Date.now()}`,
      timestamp: formatCurrentTimestamp(),
      actor: `${actorName} · Admin`,
      event: 'Duyệt & Chốt bảng lương',
      result: 'Đã khóa · Chi phí được phê duyệt',
    },
  ]

  return listPayrollPeriod({ periodKey: period.periodKey })
}

export async function unlockPayrollPeriod(
  periodKey: string,
  reason: string,
  actorName = 'Nguyễn Minh Anh',
): Promise<PayrollPeriodSummary> {
  const trimmedReason = reason.trim()
  if (!trimmedReason) {
    throw new Error('Vui lòng nhập lý do mở khóa bảng lương.')
  }

  const period = findPeriod(periodKey)
  const hasPaidAny = period.rows.some((r) => r.payoutStatus === 'paid')
  if (period.status === 'settled' || period.status === 'partially_paid' || hasPaidAny) {
    throw new Error('Không thể mở khóa bảng lương đã phát sinh khoản chi.')
  }

  period.status = 'draft'
  period.approvedDate = undefined
  period.approvedAt = undefined
  period.approvedBy = undefined
  period.history = [
    ...period.history,
    {
      id: `HIS-UNLOCK-${Date.now()}`,
      timestamp: formatCurrentTimestamp(),
      actor: `${actorName} · Admin`,
      event: 'Mở khóa bảng lương',
      result: trimmedReason,
    },
  ]

  return listPayrollPeriod({ periodKey: period.periodKey })
}

export async function executeBatchPayout(
  input: BatchPayoutInput,
): Promise<PayrollPeriodSummary> {
  const period = findPeriod(input.periodKey)
  if (period.status === 'draft') {
    throw new Error('Vui lòng duyệt & chốt bảng lương trước khi chi trả.')
  }
  if (input.employeeIds.length === 0) {
    throw new Error('Vui lòng chọn ít nhất một nhân viên chưa thanh toán.')
  }
  if (!input.payoutDate.trim()) {
    throw new Error('Vui lòng chọn ngày chi trả.')
  }
  if (input.method === 'bank_transfer' && !input.transactionRef.trim()) {
    throw new Error('Vui lòng nhập mã giao dịch ngân hàng.')
  }

  const targetIds = new Set(input.employeeIds)
  const batchNumber = period.batches.length + 1
  const resolvedRef =
    input.method === 'bank_transfer'
      ? input.transactionRef.trim()
      : input.transactionRef.trim() || `PC-20261003-00${batchNumber + 7}`

  let batchAmount = 0
  const paidNames: string[] = []

  period.rows = period.rows.map((row) => {
    if (!targetIds.has(row.id) || row.payoutStatus === 'paid') {
      return row
    }
    batchAmount += row.netPay
    paidNames.push(row.fullName.split(' ').slice(-1)[0] || row.fullName)
    return {
      ...row,
      payoutStatus: 'paid',
      payoutDate: input.payoutDate.trim(),
      payoutMethod: input.method,
      transactionRef: resolvedRef,
    }
  })

  if (paidNames.length === 0) {
    throw new Error('Các nhân viên được chọn đã được thanh toán.')
  }

  const allPaid = period.rows.every((r) => r.payoutStatus === 'paid')
  period.status = allPaid ? 'settled' : 'partially_paid'
  period.payoutDate = input.payoutDate.trim()
  period.payoutMethod = input.method
  period.transactionRef = resolvedRef
  period.payoutConfirmedBy = input.actorName

  period.batches = [
    ...period.batches,
    {
      id: `BATCH-${period.periodKey}-${batchNumber}`,
      batchNumber,
      method: input.method,
      transactionRef: resolvedRef,
      payoutDate: input.payoutDate.trim(),
      amount: batchAmount,
      employeeNames: paidNames,
      note: input.note?.trim(),
      attachmentName: input.attachmentName,
      confirmedBy: input.actorName,
    },
  ]

  period.history = [
    ...period.history,
    {
      id: `HIS-PAY-${Date.now()}`,
      timestamp: formatCurrentTimestamp(),
      actor: `${input.actorName} · Admin`,
      event:
        input.method === 'bank_transfer'
          ? `Xác nhận chuyển khoản đợt ${batchNumber}`
          : `Chi tiền mặt đợt ${batchNumber}`,
      result: `${resolvedRef} · ${formatVnd(batchAmount)}`,
    },
  ]

  return listPayrollPeriod({ periodKey: period.periodKey })
}

export async function sendPayrollZaloPayslips(
  periodKey: string,
  employeeIds: string[],
  actorName = 'Nguyễn Minh Anh',
): Promise<PayrollPeriodSummary> {
  const period = findPeriod(periodKey)
  if (period.status === 'draft') {
    throw new Error('Chỉ được gửi phiếu lương sau khi Admin duyệt bảng lương.')
  }

  const targetIds = new Set(employeeIds)
  let sentNow = 0
  period.rows = period.rows.map((row) => {
    if (!targetIds.has(row.id)) return row
    sentNow += 1
    return {
      ...row,
      zaloStatus: 'sent',
      zaloSentAt: '03/10/2026, 09:42',
      zaloErrorReason: undefined,
    }
  })

  period.history = [
    ...period.history,
    {
      id: `HIS-ZALO-${Date.now()}`,
      timestamp: formatCurrentTimestamp(),
      actor: `${actorName} · Admin`,
      event: 'Gửi phiếu lương qua Zalo',
      result: `${sentNow} phiếu đã gửi thành công`,
    },
  ]

  return listPayrollPeriod({ periodKey: period.periodKey })
}

export async function listNextPeriodAdjustments(): Promise<
  NextPeriodAdjustmentRecord[]
> {
  return [...nextAdjustmentsStore]
}

export async function createNextPeriodAdjustment(
  input: CreateNextAdjustmentInput,
): Promise<NextPeriodAdjustmentRecord> {
  if (!input.reason.trim()) {
    throw new Error('Vui lòng nhập lý do, căn cứ và phạm vi điều chỉnh.')
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Số tiền điều chỉnh phải lớn hơn 0.')
  }

  const period = findPeriod(input.sourcePeriodKey || '09/2026')
  const emp =
    period.rows.find((r) => r.id === input.employeeId) ?? period.rows[0]

  const record: NextPeriodAdjustmentRecord = {
    id: `ADJ-202610-00${nextAdjustmentsStore.length + 1}`,
    sourcePayrollCode: input.sourcePayrollCode || period.payrollCode,
    sourcePeriodKey: input.sourcePeriodKey || period.periodKey,
    sourceVoucherRef:
      input.sourceVoucherRef || period.transactionRef || 'BANK-PAY-20261003-001',
    employeeId: emp.id,
    employeeLabel: `${emp.fullName} · ${emp.employeeCode}`,
    targetPeriodKey: input.targetPeriodKey,
    category: input.category,
    adjustmentType: input.adjustmentType,
    amount: Math.round(input.amount),
    referenceCode: input.referenceCode?.trim() || '',
    reason: input.reason.trim(),
    attachmentName: input.attachmentName,
    status: input.mode,
    createdAt: formatCurrentTimestamp(),
  }

  nextAdjustmentsStore = [record, ...nextAdjustmentsStore]
  return record
}

export async function getPayslipDetail(
  employeeId = 'NV-0002',
  periodKey = '09/2026',
): Promise<PayslipDetailDto> {
  const normalizedPeriod =
    PAYSLIP_PERIOD_OPTIONS.find((p) => p.periodKey === periodKey)?.periodKey ??
    '09/2026'

  const payrollPeriod =
    payrollPeriodsStore.find((p) => p.periodKey === normalizedPeriod) ??
    payrollPeriodsStore[0]

  const row =
    payrollPeriod.rows.find((r) => r.id === employeeId) ??
    payrollPeriod.rows[0]

  const isPendingPayout = normalizedPeriod === '10/2026'
  const totalIncome =
    row.baseSalary + row.overtimeAmount + row.bonus + row.allowance
  const totalDeduction =
    row.deduction + row.mandatoryContribution + row.taxAmount

  const periodRangeMap: Record<string, string> = {
    '10/2026': '01/10–31/10/2026',
    '09/2026': '01/09–30/09/2026',
    '08/2026': '01/08–31/08/2026',
    '07/2026': '01/07–31/07/2026',
  }

  const netPayWordsMap: Record<number, string> = {
    5380000: 'Năm triệu ba trăm tám mươi nghìn đồng.',
    6365000: 'Sáu triệu ba trăm sáu mươi lăm nghìn đồng.',
    13820000: 'Mười ba triệu tám trăm hai mươi nghìn đồng.',
    5285000: 'Năm triệu hai trăm tám mươi lăm nghìn đồng.',
  }

  const shortMonthCode = normalizedPeriod.replace('/', '')
  const payslipCode = `PAY-${shortMonthCode.slice(2)}${shortMonthCode.slice(0, 2)}-${row.employeeCode.replace(/-/g, '')}`

  return {
    payslipCode,
    periodKey: normalizedPeriod,
    periodRange: periodRangeMap[normalizedPeriod] ?? '01/09–30/09/2026',
    payrollCode: `PAY-${shortMonthCode.slice(2)}${shortMonthCode.slice(0, 2)}`,
    attendanceSourceCode: `ATT-${shortMonthCode.slice(2)}${shortMonthCode.slice(0, 2)}`,
    payrollStatus: isPendingPayout ? 'approved_unpaid' : 'settled',
    payoutStatus: isPendingPayout ? 'pending_payout' : 'paid',
    payoutDate: isPendingPayout ? undefined : '03/10/2026',
    expectedPayoutDate: isPendingPayout ? '03/11/2026' : '03/10/2026',
    approvedBy: 'Nguyễn Minh Anh',
    approvedAt: isPendingPayout ? '02/11/2026 · 14:20' : '02/10/2026 · 14:20',
    employeeId: row.id,
    employeeCode: row.employeeCode,
    employeeName: row.fullName,
    employeeRoleLabel: row.roleLabel.replace('Nhân viên · ', ''),
    storeName: 'Nhà sách Mây · Cơ sở 01',
    bankAccount: row.bankAccount,
    transactionRef: isPendingPayout ? undefined : 'BANK-PAY-20261003-001',
    standardHours: row.standardHours,
    hourlyRate: row.hourlyRate,
    baseSalary: row.baseSalary,
    overtimeHours: row.overtimeHours,
    overtimeAmount: row.overtimeAmount,
    bonus: row.bonus,
    bonusNote: row.bonusItems[0]?.label ?? 'Đạt mục tiêu phục vụ tháng 09',
    allowance: row.allowance,
    allowanceNote: 'Ăn ca / Đi lại',
    mandatoryContribution: row.mandatoryContribution,
    mandatoryContributionNote: 'Hồ sơ minh họa: thử việc, chưa tham gia',
    taxAmount: row.taxAmount,
    taxNote: '0đ · Cần đối chiếu hồ sơ thuế minh họa',
    deduction: row.deduction,
    advanceVoucherCode: row.deductionItems[0]?.voucherCode ?? 'ADV-0921',
    totalIncome,
    totalDeduction,
    netPay: row.netPay,
    netPayInWords:
      netPayWordsMap[row.netPay] ?? `${formatVnd(row.netPay)}.`,
    zaloStatus: row.zaloStatus,
    zaloSentAt: row.zaloSentAt ?? '03/10/2026, 09:35',
    zaloLinked: row.zaloLinked,
    availablePeriods: PAYSLIP_PERIOD_OPTIONS,
    attendanceDays: PHONG_ATTENDANCE_DAYS_092026,
    overtimeEntries: PHONG_OVERTIME_ENTRIES_092026,
    advanceVoucher: {
      ...PHONG_ADVANCE_VOUCHER_092026,
      employeeLabel: `${row.fullName} · ${row.employeeCode}`,
      amount: row.deduction || 100000,
    },
    disputes: [...payslipDisputesStore],
  }
}

export async function createPayslipDispute(
  input: CreatePayslipDisputeInput,
): Promise<PayslipDisputeRecord> {
  const trimmed = input.content.trim()
  if (!trimmed) {
    throw new Error('Vui lòng nhập nội dung đối chiếu.')
  }

  const nextNum = payslipDisputesStore.length + 1
  const code = `DC-0926-${String(nextNum).padStart(3, '0')}`
  const newDispute: PayslipDisputeRecord = {
    id: code,
    payslipCode: `PAY-202609-${input.employeeId.replace(/-/g, '')}`,
    category: input.category,
    categoryLabel: PAYSLIP_DISPUTE_CATEGORY_LABELS[input.category],
    status: 'pending_response',
    statusLabel: PAYSLIP_DISPUTE_STATUS_LABELS.pending_response,
    content: trimmed,
    attachmentName: input.attachmentName,
    attachmentSize: input.attachmentSize,
    submittedAt: formatCurrentTimestamp(),
  }

  payslipDisputesStore = [newDispute, ...payslipDisputesStore]
  return newDispute
}

export async function resendSinglePayslipZalo(
  employeeId: string,
  periodKey: string,
): Promise<{ sentAt: string }> {
  const period = findPeriod(periodKey === '10/2026' ? '10/2026' : '09/2026')
  const sentAt = '04/10/2026, 10:32'
  period.rows = period.rows.map((row) =>
    row.id === employeeId
      ? { ...row, zaloStatus: 'sent', zaloSentAt: sentAt, zaloErrorReason: undefined }
      : row,
  )
  return { sentAt }
}
