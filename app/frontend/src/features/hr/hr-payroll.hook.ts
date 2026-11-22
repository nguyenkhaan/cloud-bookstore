import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adjustDraftPayrollEmployee,
  approveAndLockPayroll,
  createNextPeriodAdjustment,
  createPayslipDispute,
  executeBatchPayout,
  getPayslipDetail,
  initializePayrollFromAttendance,
  listPayrollPeriod,
  resendSinglePayslipZalo,
  sendPayrollZaloPayslips,
  unlockPayrollPeriod,
} from './hr-payroll.service'
import type {
  BatchPayoutInput,
  CreateNextAdjustmentInput,
  CreatePayslipDisputeInput,
  ListPayrollParams,
  ManualAdjustInput,
} from './hr-payroll.type'

export const hrPayrollKeys = {
  all: ['hr-payroll'] as const,
  period: (params: ListPayrollParams) =>
    [...hrPayrollKeys.all, 'period', params] as const,
  payslip: (employeeId: string, periodKey: string) =>
    [...hrPayrollKeys.all, 'payslip', employeeId, periodKey] as const,
}

export function useHrPayrollPeriodQuery(
  params: ListPayrollParams,
  enabled = true,
) {
  return useQuery({
    queryKey: hrPayrollKeys.period(params),
    queryFn: () => listPayrollPeriod(params),
    enabled,
  })
}

export function useInitializePayrollMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      periodKey,
      actorName,
    }: {
      periodKey: string
      actorName?: string
    }) => initializePayrollFromAttendance(periodKey, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrPayrollKeys.all })
    },
  })
}

export function useAdjustDraftPayrollMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      input,
      actorName,
    }: {
      input: ManualAdjustInput
      actorName?: string
    }) => adjustDraftPayrollEmployee(input, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrPayrollKeys.all })
    },
  })
}

export function useApprovePayrollMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      periodKey,
      actorName,
    }: {
      periodKey: string
      actorName?: string
    }) => approveAndLockPayroll(periodKey, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrPayrollKeys.all })
    },
  })
}

export function useUnlockPayrollMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      periodKey,
      reason,
      actorName,
    }: {
      periodKey: string
      reason: string
      actorName?: string
    }) => unlockPayrollPeriod(periodKey, reason, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrPayrollKeys.all })
    },
  })
}

export function useBatchPayoutMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BatchPayoutInput) => executeBatchPayout(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrPayrollKeys.all })
    },
  })
}

export function useSendPayrollZaloMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      periodKey,
      employeeIds,
      actorName,
    }: {
      periodKey: string
      employeeIds: string[]
      actorName?: string
    }) => sendPayrollZaloPayslips(periodKey, employeeIds, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrPayrollKeys.all })
    },
  })
}

export function useCreateNextPeriodAdjustmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateNextAdjustmentInput) =>
      createNextPeriodAdjustment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrPayrollKeys.all })
    },
  })
}

export function usePayslipDetailQuery(employeeId: string, periodKey: string) {
  return useQuery({
    queryKey: hrPayrollKeys.payslip(employeeId, periodKey),
    queryFn: () => getPayslipDetail(employeeId, periodKey),
  })
}

export function useCreatePayslipDisputeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePayslipDisputeInput) =>
      createPayslipDispute(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrPayrollKeys.all })
    },
  })
}

export function useResendSinglePayslipZaloMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      employeeId,
      periodKey,
    }: {
      employeeId: string
      periodKey: string
    }) => resendSinglePayslipZalo(employeeId, periodKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrPayrollKeys.all })
    },
  })
}
