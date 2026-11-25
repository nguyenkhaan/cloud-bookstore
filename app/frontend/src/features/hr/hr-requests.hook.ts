import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth.hook'
import {
  cancelHrRequest,
  createHrRequest,
  getHrRequestOptions,
  getHrRequestsSummary,
  reviewHrRequest,
} from './hr-requests.service'
import type {
  CreateHrRequestInput,
  HrRequestFilterQuery,
  ReviewHrRequestInput,
} from './hr-requests.type'

export const hrRequestKeys = {
  all: ['hr', 'requests'] as const,
  summary: (
    mineFilter: HrRequestFilterQuery,
    approvalFilter: HrRequestFilterQuery,
    includeApproval: boolean,
  ) => [...hrRequestKeys.all, 'summary', mineFilter, approvalFilter, includeApproval] as const,
  options: () => [...hrRequestKeys.all, 'options'] as const,
}

export function useHrRequestsSummaryQuery(
  mineFilter: HrRequestFilterQuery,
  approvalFilter: HrRequestFilterQuery,
  includeApproval = true,
) {
  const { session } = useAuth()
  return useQuery({
    queryKey: hrRequestKeys.summary(mineFilter, approvalFilter, includeApproval),
    queryFn: () => getHrRequestsSummary(mineFilter, approvalFilter, includeApproval),
    enabled: Boolean(session),
  })
}

export function useHrRequestOptionsQuery() {
  const { session } = useAuth()
  return useQuery({
    queryKey: hrRequestKeys.options(),
    queryFn: getHrRequestOptions,
    enabled: Boolean(session),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateHrRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['hr', 'requests', 'create'],
    mutationFn: (input: CreateHrRequestInput) => createHrRequest(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hrRequestKeys.all })
    },
  })
}

export function useCancelHrRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['hr', 'requests', 'cancel'],
    mutationFn: (requestId: string) => cancelHrRequest(requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hrRequestKeys.all })
    },
  })
}

export function useReviewHrRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['hr', 'requests', 'review'],
    mutationFn: (input: ReviewHrRequestInput) => reviewHrRequest(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: hrRequestKeys.all })
    },
  })
}
