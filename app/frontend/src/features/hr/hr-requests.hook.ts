import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createHrRequest,
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
  ) => [...hrRequestKeys.all, 'summary', mineFilter, approvalFilter] as const,
}

export function useHrRequestsSummaryQuery(
  mineFilter: HrRequestFilterQuery,
  approvalFilter: HrRequestFilterQuery,
  includeApproval = true,
) {
  return useQuery({
    queryKey: hrRequestKeys.summary(mineFilter, approvalFilter),
    queryFn: () => getHrRequestsSummary(mineFilter, approvalFilter, includeApproval),
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
