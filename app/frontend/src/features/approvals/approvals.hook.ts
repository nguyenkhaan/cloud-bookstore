import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approvalsService } from './approvals.service'
import type {
  ApprovalQuery,
  CancelInventoryAdjustmentRequest,
  CreateInventoryAdjustmentRequest,
  InventoryAdjustmentQuery,
  UpdateApprovalStatusRequest,
  UpdateInventoryAdjustmentStatusRequest,
} from './approvals.type'

export const approvalsQueryKeys = {
  all: ['approvals'] as const,
  overviewStats: () => [...approvalsQueryKeys.all, 'overview-stats'] as const,
  buybacks: (query?: ApprovalQuery) => [...approvalsQueryKeys.all, 'buybacks', query] as const,
  buybackDetail: (id: string | null) => [...approvalsQueryKeys.all, 'buyback-detail', id] as const,
  damagePenalties: (query?: ApprovalQuery) => [...approvalsQueryKeys.all, 'damage-penalties', query] as const,
  damagePenaltyDetail: (id: string | null) => [...approvalsQueryKeys.all, 'damage-penalty-detail', id] as const,
  disposalReversals: (query?: ApprovalQuery) => [...approvalsQueryKeys.all, 'disposal-reversals', query] as const,
  disposalReversalDetail: (id: string | null) => [...approvalsQueryKeys.all, 'disposal-reversal-detail', id] as const,
  inventoryList: (query?: InventoryAdjustmentQuery) => [...approvalsQueryKeys.all, 'inventory-list', query] as const,
  inventoryStats: () => [...approvalsQueryKeys.all, 'inventory-stats'] as const,
  inventoryDetail: (id: string | null) => [...approvalsQueryKeys.all, 'inventory-detail', id] as const,
  bookCopies: () => [...approvalsQueryKeys.all, 'book-copies'] as const,
}

// --- Overview Stats ---
export function useApprovalsOverviewStatsQuery() {
  return useQuery({
    queryKey: approvalsQueryKeys.overviewStats(),
    queryFn: () => approvalsService.getOverviewStats(),
  })
}

// --- Tab 1: Buyback Approvals ---
export function useBuybackApprovalsQuery(query: ApprovalQuery) {
  return useQuery({
    queryKey: approvalsQueryKeys.buybacks(query),
    queryFn: () => approvalsService.getBuybacks(query),
  })
}

export function useBuybackApprovalDetailQuery(id: string | null) {
  return useQuery({
    queryKey: approvalsQueryKeys.buybackDetail(id),
    queryFn: () => (id ? approvalsService.getBuybackDetail(id) : null),
    enabled: Boolean(id),
  })
}

export function useUpdateBuybackStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateApprovalStatusRequest }) =>
      approvalsService.updateBuybackStatus(id, dto),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.buybackDetail(variables.id) })
    },
  })
}

// --- Tab 2: Damage Penalty Approvals ---
export function useDamagePenaltyApprovalsQuery(query: ApprovalQuery) {
  return useQuery({
    queryKey: approvalsQueryKeys.damagePenalties(query),
    queryFn: () => approvalsService.getDamagePenalties(query),
  })
}

export function useDamagePenaltyApprovalDetailQuery(id: string | null) {
  return useQuery({
    queryKey: approvalsQueryKeys.damagePenaltyDetail(id),
    queryFn: () => (id ? approvalsService.getDamagePenaltyDetail(id) : null),
    enabled: Boolean(id),
  })
}

export function useUpdateDamagePenaltyStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateApprovalStatusRequest }) =>
      approvalsService.updateDamagePenaltyStatus(id, dto),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.damagePenaltyDetail(variables.id) })
    },
  })
}

// --- Tab 4: Disposal & Reversal Approvals ---
export function useDisposalReversalApprovalsQuery(query: ApprovalQuery) {
  return useQuery({
    queryKey: approvalsQueryKeys.disposalReversals(query),
    queryFn: () => approvalsService.getDisposalReversals(query),
  })
}

export function useDisposalReversalDetailQuery(id: string | null) {
  return useQuery({
    queryKey: approvalsQueryKeys.disposalReversalDetail(id),
    queryFn: () => (id ? approvalsService.getDisposalReversalDetail(id) : null),
    enabled: Boolean(id),
  })
}

export function useUpdateDisposalReversalStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateApprovalStatusRequest }) =>
      approvalsService.updateDisposalReversalStatus(id, dto),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.disposalReversalDetail(variables.id) })
    },
  })
}

// --- Tab 3: Inventory Adjustments ---
export function useAllBookCopiesQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: approvalsQueryKeys.bookCopies(),
    queryFn: () => approvalsService.getAllBookCopies(),
    enabled,
  })
}

export function useApprovalsQuery(query: InventoryAdjustmentQuery) {
  return useQuery({
    queryKey: approvalsQueryKeys.inventoryList(query),
    queryFn: () => approvalsService.getAdjustments(query),
  })
}

export function useApprovalsStatsQuery() {
  return useQuery({
    queryKey: approvalsQueryKeys.inventoryStats(),
    queryFn: () => approvalsService.getStats(),
  })
}

export function useApprovalDetailQuery(id: string | null) {
  return useQuery({
    queryKey: approvalsQueryKeys.inventoryDetail(id),
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
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.inventoryDetail(variables.id) })
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
      void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.inventoryDetail(variables.id) })
    },
  })
}
