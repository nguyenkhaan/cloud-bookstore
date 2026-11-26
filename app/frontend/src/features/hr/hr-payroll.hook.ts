import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adjustDraftPayrollEmployee,
  approveAndLockPayroll,
  createNextPeriodAdjustment,
  createPayslipDispute,
  executeBatchPayout,
  getEmployeePayslipDetail,
  getMyPayslipDetail,
  getPayrollBreakdown,
  initializePayrollFromAttendance,
  listPayrollPeriod,
  listPayrollPeriods,
  resendSinglePayslipZalo,
  respondPayslipDispute,
  sendPayrollZaloPayslips,
  unlockPayrollPeriod,
} from './hr-payroll.service'
import type { BatchPayoutInput, CreateNextAdjustmentInput, CreatePayslipDisputeInput, ListPayrollParams, ManualAdjustInput } from './hr-payroll.type'

export const hrPayrollKeys = {
  all: ['hr-payroll'] as const,
  period: (params: ListPayrollParams) => [...hrPayrollKeys.all, 'period', params] as const,
  payslip: (employeeId: string, periodKey: string) => [...hrPayrollKeys.all, 'payslip', employeeId, periodKey] as const,
}

export function useHrPayrollPeriodsListQuery(enabled = true) {
  return useQuery({ queryKey: [...hrPayrollKeys.all, 'periods'], queryFn: listPayrollPeriods, enabled })
}

export function useHrPayrollPeriodQuery(params: ListPayrollParams, enabled = true) {
  return useQuery({ queryKey: hrPayrollKeys.period(params), queryFn: () => listPayrollPeriod(params), enabled })
}

export function usePayrollBreakdownQuery(periodKey: string, employeeId: string, enabled = true) {
  return useQuery({
    queryKey: [...hrPayrollKeys.all, 'breakdown', periodKey, employeeId],
    queryFn: () => getPayrollBreakdown(periodKey, employeeId),
    enabled: enabled && Boolean(periodKey) && Boolean(employeeId),
  })
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  return () => queryClient.invalidateQueries({ queryKey: hrPayrollKeys.all })
}

export function useInitializePayrollMutation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: ({ periodKey, actorName }: { periodKey: string; actorName?: string }) => initializePayrollFromAttendance(periodKey, actorName), onSuccess: invalidate(queryClient) })
}

export function useAdjustDraftPayrollMutation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: ({ input, actorName }: { input: ManualAdjustInput; actorName?: string }) => adjustDraftPayrollEmployee(input, actorName), onSuccess: invalidate(queryClient) })
}

export function useApprovePayrollMutation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: ({ periodKey, actorName }: { periodKey: string; actorName?: string }) => approveAndLockPayroll(periodKey, actorName), onSuccess: invalidate(queryClient) })
}

export function useUnlockPayrollMutation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: ({ periodKey, reason, actorName }: { periodKey: string; reason: string; actorName?: string }) => unlockPayrollPeriod(periodKey, reason, actorName), onSuccess: invalidate(queryClient) })
}

export function useBatchPayoutMutation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (input: BatchPayoutInput) => executeBatchPayout(input), onSuccess: invalidate(queryClient) })
}

export function useSendPayrollZaloMutation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: ({ periodKey, employeeIds, actorName }: { periodKey: string; employeeIds: string[]; actorName?: string }) => sendPayrollZaloPayslips(periodKey, employeeIds, actorName), onSuccess: invalidate(queryClient) })
}

export function useCreateNextPeriodAdjustmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (input: CreateNextAdjustmentInput) => createNextPeriodAdjustment(input), onSuccess: invalidate(queryClient) })
}

export function useMyPayslipDetailQuery(periodKey?: string, enabled = true) {
  return useQuery({ queryKey: [...hrPayrollKeys.all, 'my-payslip', periodKey], queryFn: () => getMyPayslipDetail(periodKey), enabled })
}

export function useEmployeePayslipDetailQuery(employeeId: string, periodKey?: string, enabled = true) {
  return useQuery({ queryKey: hrPayrollKeys.payslip(employeeId, periodKey ?? ''), queryFn: () => getEmployeePayslipDetail(employeeId, periodKey), enabled: enabled && Boolean(employeeId) })
}

export function usePayslipDetailQuery(employeeId: string, periodKey: string) {
  return useEmployeePayslipDetailQuery(employeeId, periodKey)
}

export function useCreatePayslipDisputeMutation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (input: CreatePayslipDisputeInput) => createPayslipDispute(input), onSuccess: invalidate(queryClient) })
}

export function useRespondPayslipDisputeMutation() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: ({ disputeId, input }: { disputeId: string; input: Record<string, unknown> }) => respondPayslipDispute(disputeId, input), onSuccess: invalidate(queryClient) })
}

export function useResendSinglePayslipZaloMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, employeeId, periodKey }: { entryId?: string; employeeId: string; periodKey: string }) =>
      resendSinglePayslipZalo(entryId || employeeId, periodKey),
    onSuccess: invalidate(queryClient),
  })
}
