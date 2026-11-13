import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approvalsService } from './approvals.service'
import type {
  CancelInventoryAdjustmentRequest,
  CreateInventoryAdjustmentRequest,
  InventoryAdjustmentQuery,
  UpdateInventoryAdjustmentStatusRequest,
} from './approvals.type'

export const approvalsQueryKeys = {
  all: ['inventory-adjustments'] as const,
  list: (query: InventoryAdjustmentQuery) => ['inventory-adjustments', 'list', query] as const,
  stats: () => ['inventory-adjustments', 'stats'] as const,
  detail: (id: string | null) => ['inventory-adjustments', 'detail', id] as const,
}

export function useApprovalsQuery(query: InventoryAdjustmentQuery) {
  return useQuery({
    queryKey: approvalsQueryKeys.list(query),
    queryFn: () => approvalsService.getAdjustments(query),
  })
}

export function useApprovalsStatsQuery() {
  return useQuery({
    queryKey: approvalsQueryKeys.stats(),
    queryFn: () => approvalsService.getStats(),
  })
}

export function useApprovalDetailQuery(id: string | null) {
  return useQuery({
    queryKey: approvalsQueryKeys.detail(id),
    queryFn: () => (id ? approvalsService.getAdjustmentDetail(id) : null),
    enabled: Boolean(id),
  })
}

export function useCreateApprovalMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateInventoryAdjustmentRequest) => approvalsService.createAdjustment(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.all })
    },
  })
}

export function useUpdateApprovalStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateInventoryAdjustmentStatusRequest }) =>
      approvalsService.updateAdjustmentStatus(id, dto),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.detail(variables.id) })
    },
  })
}

export function useCancelApprovalMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CancelInventoryAdjustmentRequest }) =>
      approvalsService.cancelAdjustment(id, dto),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.detail(variables.id) })
    },
  })
}
