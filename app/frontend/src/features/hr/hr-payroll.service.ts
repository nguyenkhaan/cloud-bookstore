import { privateClient } from '@/api/client'
import type {
  BatchPayoutInput,
  CreateNextAdjustmentInput,
  CreatePayslipDisputeInput,
  ListPayrollParams,
  ManualAdjustInput,
  NextPeriodAdjustmentRecord,
  PayrollPeriodSummary,
  PayslipDetailDto,
  PayslipDisputeRecord,
} from './hr-payroll.type'

type PeriodResponse = PayrollPeriodSummary
type QueryParams = ListPayrollParams & { status?: string; page?: number; pageSize?: number }

export async function listPayrollPeriods(): Promise<unknown[]> {
  const { data } = await privateClient.get<unknown[]>('/hr/payroll/periods')
  return data
}

export async function listPayrollPeriod(params: ListPayrollParams = {}): Promise<PeriodResponse> {
  const { data } = await privateClient.get<PeriodResponse>(`/hr/payroll/periods/${encodeURIComponent(params.periodKey ?? '')}`, {
    params: {
      page: 1,
      pageSize: 200,
      search: params.search,
      status: params.statusFilter || undefined,
      payoutFilter: params.payoutFilter || undefined,
    } satisfies QueryParams,
  })
  return data
}

export async function initializePayrollFromAttendance(periodKey: string, _actorName?: string): Promise<PeriodResponse> {
  const { data } = await privateClient.post<PeriodResponse>(`/hr/payroll/periods/${encodeURIComponent(periodKey)}/initialize`)
  return data
}

export async function adjustDraftPayrollEmployee(input: ManualAdjustInput, _actorName?: string): Promise<PeriodResponse> {
  const { data } = await privateClient.patch<PeriodResponse>(
    `/hr/payroll/periods/${encodeURIComponent(input.periodKey)}/employees/${input.employeeId}`,
    { bonus: input.bonus, allowance: input.allowance, deduction: input.deduction, note: input.note },
  )
  return data
}

export async function approveAndLockPayroll(periodKey: string, _actorName?: string): Promise<PeriodResponse> {
  const { data } = await privateClient.post<PeriodResponse>(`/hr/payroll/periods/${encodeURIComponent(periodKey)}/approve`)
  return data
}

export async function unlockPayrollPeriod(periodKey: string, reason: string, _actorName?: string): Promise<PeriodResponse> {
  const { data } = await privateClient.post<PeriodResponse>(`/hr/payroll/periods/${encodeURIComponent(periodKey)}/unlock`, { reason })
  return data
}

export async function executeBatchPayout(input: BatchPayoutInput): Promise<PeriodResponse> {
  const { data } = await privateClient.post<PeriodResponse>(`/hr/payroll/periods/${encodeURIComponent(input.periodKey)}/payouts`, {
    employeeIds: input.employeeIds,
    method: input.method,
    transactionRef: input.transactionRef || undefined,
    payoutDate: input.payoutDate,
    note: input.note,
  })
  return data
}

export async function sendPayrollZaloPayslips(periodKey: string, employeeIds: string[], _actorName?: string): Promise<PeriodResponse> {
  const { data } = await privateClient.post<PeriodResponse>(`/hr/payroll/periods/${encodeURIComponent(periodKey)}/send-zalo`, { employeeIds })
  return data
}

export async function listNextPeriodAdjustments(periodKey?: string): Promise<NextPeriodAdjustmentRecord[]> {
  const { data } = await privateClient.get<NextPeriodAdjustmentRecord[]>('/hr/payroll/adjustments', { params: { periodKey } })
  return data
}

export async function createNextPeriodAdjustment(input: CreateNextAdjustmentInput): Promise<NextPeriodAdjustmentRecord> {
  const { data } = await privateClient.post<NextPeriodAdjustmentRecord>('/hr/payroll/adjustments', {
    employeeId: input.employeeId,
    sourcePeriodKey: input.sourcePeriodKey,
    sourceVoucherRef: input.sourceVoucherRef,
    targetPeriodKey: input.targetPeriodKey,
    category: input.category,
    adjustmentType: input.adjustmentType,
    amount: input.amount,
    referenceCode: input.referenceCode,
    reason: input.reason,
    mode: input.mode,
  })
  return data
}

export async function getPayrollBreakdown(periodKey: string, employeeId: string): Promise<unknown> {
  const { data } = await privateClient.get(`/hr/payroll/periods/${encodeURIComponent(periodKey)}/employees/${employeeId}/breakdown`)
  return data
}

export async function getMyPayslipDetail(periodKey?: string): Promise<PayslipDetailDto> {
  const { data } = await privateClient.get<PayslipDetailDto>('/hr/payslips/me', { params: { periodKey } })
  return data
}

export async function getEmployeePayslipDetail(employeeId: string, periodKey?: string): Promise<PayslipDetailDto> {
  const { data } = await privateClient.get<PayslipDetailDto>(`/hr/payslips/${employeeId}`, { params: { periodKey } })
  return data
}

export async function getPayslipDetail(employeeId: string, periodKey: string): Promise<PayslipDetailDto> {
  return getEmployeePayslipDetail(employeeId, periodKey)
}

export async function createPayslipDispute(input: CreatePayslipDisputeInput): Promise<PayslipDisputeRecord> {
  const { data } = await privateClient.post<PayslipDisputeRecord>(`/hr/payslips/${input.employeeId}/disputes`, {
    category: input.category,
    content: input.content,
  })
  return data
}

export async function respondPayslipDispute(disputeId: string, input: Record<string, unknown>): Promise<unknown> {
  const { data } = await privateClient.post(`/hr/payslips/disputes/${disputeId}/respond`, input)
  return data
}

export async function resendSinglePayslipZalo(entryId: string, _periodKey?: string): Promise<{ sentAt?: string }> {
  const { data } = await privateClient.post<{ sentAt?: string }>(`/hr/payslips/${entryId}/resend-zalo`)
  return data
}
