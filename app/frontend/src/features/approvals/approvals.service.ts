import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import { privateClient } from '@/api/client'
import type {
  ApprovalQuery,
  ApprovalsOverviewStats,
  BookCopyStatus,
  BuybackApprovalDetail,
  BuybackApprovalItem,
  CancelInventoryAdjustmentRequest,
  CreateBuybackApprovalRequest,
  CreateDamagePenaltyApprovalRequest,
  CreateDisposalReversalApprovalRequest,
  CreateInventoryAdjustmentRequest,
  DamagePenaltyApprovalDetail,
  DamagePenaltyApprovalItem,
  DisposalReversalApprovalDetail,
  DisposalReversalApprovalItem,
  InventoryAdjustmentDetail,
  InventoryAdjustmentItem,
  InventoryAdjustmentQuery,
  InventoryAdjustmentStats,
  InventoryAdjustmentStatus,
  InventoryVarianceType,
  PagedResult,
  SelectableBookCopy,
  UpdateApprovalStatusRequest,
  UpdateInventoryAdjustmentStatusRequest,
} from './approvals.type'

export class ApprovalApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApprovalApiError'
    this.status = status
  }
}

function messageFrom(error: AxiosError<unknown>): string {
  const data = error.response?.data
  if (typeof data === 'object' && data !== null) {
    const body = data as Record<string, unknown>
    if (typeof body.message === 'string') return body.message
    if (typeof body.detail === 'string') return body.detail
    if (typeof body.title === 'string') return body.title
  }
  return error.message
}

async function requestData<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const response = await request()
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new ApprovalApiError(error.response?.status ?? 500, messageFrom(error))
    }
    throw error
  }
}

type ApiAdjustment = {
  id: string
  inventoryCheckId?: string | null
  checkCode?: string | null
  checkNote?: string | null
  copyId: string
  copyBarcode: string
  isbn?: string | null
  titleName?: string | null
  currentCopyStatus: BookCopyStatus
  expectedStatus?: BookCopyStatus | null
  requestedStatus: BookCopyStatus
  varianceType?: InventoryVarianceType | null
  reason?: string | null
  status: InventoryAdjustmentStatus
  requestedBy: string
  requestedByName?: string | null
  requestedAt: string
  approvedBy?: string | null
  approvedByName?: string | null
  approvedAt?: string | null
  rejectionReason?: string | null
  appliedAt?: string | null
  history?: ApiAuditItem[] | null
}

type ApiAuditItem = {
  id: string
  occurredAt: string
  actorId?: string | null
  actorName?: string | null
  action: string
  reason?: string | null
}

type ApiStats = {
  pendingCount?: number
  approvedCount?: number
  appliedCount?: number
  rejectedCount?: number
  cancelledCount?: number
  totalCount?: number
}

type ApiPaged<T> = {
  items?: T[] | null
  page?: number
  pageSize?: number
  totalCount?: number
}

function mapApiToItem(api: ApiAdjustment): InventoryAdjustmentItem {
  return {
    id: api.id,
    requestCode: api.checkCode || `ADJ-${api.id.slice(0, 8).toUpperCase()}`,
    inventoryCheckId: api.inventoryCheckId,
    copyId: api.copyId,
    copyBarcode: api.copyBarcode,
    titleName: api.titleName ?? 'Không có tên',
    originalStatus: api.expectedStatus ?? api.currentCopyStatus,
    requestedStatus: api.requestedStatus,
    varianceType: api.varianceType ?? 'NONE',
    status: api.status,
    reason: api.reason ?? '',
    requestedBy: api.requestedBy,
    requestedByName: api.requestedByName ?? api.requestedBy,
    requestedAt: api.requestedAt,
    resolvedBy: api.approvedBy,
    resolvedByName: api.approvedByName,
    resolvedAt: api.appliedAt ?? api.approvedAt,
  }
}

function mapApiToDetail(api: ApiAdjustment): InventoryAdjustmentDetail {
  return {
    ...mapApiToItem(api),
    checkCode: api.checkCode,
    checkNote: api.checkNote,
    auditLogs: (api.history ?? []).map((h) => ({
      id: h.id,
      action: h.action,
      performedBy: h.actorId,
      performedByName: h.actorName,
      timestamp: h.occurredAt,
      details: h.reason,
    })),
  }
}

export const approvalsService = {
  // --- Overview Stats ---
  async getOverviewStats(): Promise<ApprovalsOverviewStats> {
    try {
      return await requestData(() =>
        privateClient.get<ApprovalsOverviewStats>('/api/approvals/overview/stats')
      )
    } catch {
      // Fallback calculation from individual services if needed
      const adjStats = await approvalsService.getStats().catch(() => ({
        total: 0,
        pendingApproval: 0,
        approved: 0,
        applied: 0,
        rejected: 0,
        cancelled: 0,
      }))
      return {
        totalCount: adjStats.total,
        pendingCount: adjStats.pendingApproval,
        approvedCount: adjStats.approved + adjStats.applied,
        rejectedCount: adjStats.rejected + adjStats.cancelled,
        buybackPending: 0,
        damagePenaltyPending: 0,
        inventoryAdjustmentPending: adjStats.pendingApproval,
        disposalReversalPending: 0,
      }
    }
  },

  // --- Tab 1: Buyback Approvals ---
  async getBuybacks(query: ApprovalQuery): Promise<PagedResult<BuybackApprovalItem>> {
    return requestData(() =>
      privateClient.get<PagedResult<BuybackApprovalItem>>('/api/approvals/buyback', { params: query })
    )
  },

  async getBuybackDetail(id: string): Promise<BuybackApprovalDetail> {
    return requestData(() =>
      privateClient.get<BuybackApprovalDetail>(`/api/approvals/buyback/${id}`)
    )
  },

  async updateBuybackStatus(id: string, dto: UpdateApprovalStatusRequest): Promise<BuybackApprovalDetail> {
    return requestData(() =>
      privateClient.patch<BuybackApprovalDetail>(`/api/approvals/buyback/${id}/status`, dto)
    )
  },

  async createBuyback(dto: CreateBuybackApprovalRequest): Promise<BuybackApprovalDetail> {
    return requestData(() =>
      privateClient.post<BuybackApprovalDetail>('/api/approvals/buyback', dto)
    )
  },

  // --- Tab 2: Damage Penalty Approvals ---
  async getDamagePenalties(query: ApprovalQuery): Promise<PagedResult<DamagePenaltyApprovalItem>> {
    return requestData(() =>
      privateClient.get<PagedResult<DamagePenaltyApprovalItem>>('/api/approvals/damage-penalty', { params: query })
    )
  },

  async getDamagePenaltyDetail(id: string): Promise<DamagePenaltyApprovalDetail> {
    return requestData(() =>
      privateClient.get<DamagePenaltyApprovalDetail>(`/api/approvals/damage-penalty/${id}`)
    )
  },

  async updateDamagePenaltyStatus(id: string, dto: UpdateApprovalStatusRequest): Promise<DamagePenaltyApprovalDetail> {
    return requestData(() =>
      privateClient.patch<DamagePenaltyApprovalDetail>(`/api/approvals/damage-penalty/${id}/status`, dto)
    )
  },

  async createDamagePenalty(dto: CreateDamagePenaltyApprovalRequest): Promise<DamagePenaltyApprovalDetail> {
    return requestData(() =>
      privateClient.post<DamagePenaltyApprovalDetail>('/api/approvals/damage-penalty', dto)
    )
  },

  // --- Tab 4: Disposal & Reversal Approvals ---
  async getDisposalReversals(query: ApprovalQuery): Promise<PagedResult<DisposalReversalApprovalItem>> {
    return requestData(() =>
      privateClient.get<PagedResult<DisposalReversalApprovalItem>>('/api/approvals/disposal-reversal', { params: query })
    )
  },

  async getDisposalReversalDetail(id: string): Promise<DisposalReversalApprovalDetail> {
    return requestData(() =>
      privateClient.get<DisposalReversalApprovalDetail>(`/api/approvals/disposal-reversal/${id}`)
    )
  },

  async updateDisposalReversalStatus(id: string, dto: UpdateApprovalStatusRequest): Promise<DisposalReversalApprovalDetail> {
    return requestData(() =>
      privateClient.patch<DisposalReversalApprovalDetail>(`/api/approvals/disposal-reversal/${id}/status`, dto)
    )
  },

  async createDisposalReversal(dto: CreateDisposalReversalApprovalRequest): Promise<DisposalReversalApprovalDetail> {
    return requestData(() =>
      privateClient.post<DisposalReversalApprovalDetail>('/api/approvals/disposal-reversal', dto)
    )
  },

  // --- Tab 3: Inventory Adjustments ---
  async getAdjustments(query: InventoryAdjustmentQuery): Promise<PagedResult<InventoryAdjustmentItem>> {
    const raw = await approvalsService.getAdjustmentsRaw(query)
    const items = (raw.items ?? []).map(mapApiToItem)
    const totalCount = raw.totalCount ?? 0
    const pageSize = query.pageSize ?? 10
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

    return {
      items,
      page: query.page ?? 1,
      pageSize,
      totalCount,
      totalPages,
    }
  },

  async getAdjustmentsRaw(query: InventoryAdjustmentQuery): Promise<ApiPaged<ApiAdjustment>> {
    return requestData(() =>
      privateClient.get<ApiPaged<ApiAdjustment>>('/api/inventory-adjustment-requests', {
        params: {
          Page: query.page,
          PageSize: query.pageSize,
          Status: query.status,
          RequestedStatus: query.requestedStatus,
          VarianceType: query.varianceType,
          Search: query.search,
          From: query.from,
          To: query.to,
        },
      })
    )
  },

  async getAdjustmentDetail(id: string): Promise<InventoryAdjustmentDetail> {
    const raw = await requestData<ApiAdjustment>(() =>
      privateClient.get<ApiAdjustment>(`/api/inventory-adjustment-requests/${id}`)
    )
    return mapApiToDetail(raw)
  },

  async getStats(): Promise<InventoryAdjustmentStats> {
    const raw = await requestData<ApiStats>(() =>
      privateClient.get<ApiStats>('/api/inventory-adjustment-requests/stats')
    )
    return {
      total: raw.totalCount ?? 0,
      pendingApproval: raw.pendingCount ?? 0,
      approved: raw.approvedCount ?? 0,
      applied: raw.appliedCount ?? 0,
      rejected: raw.rejectedCount ?? 0,
      cancelled: raw.cancelledCount ?? 0,
    }
  },

  async createAdjustment(dto: CreateInventoryAdjustmentRequest): Promise<InventoryAdjustmentDetail> {
    const raw = await requestData<ApiAdjustment>(() =>
      privateClient.post<ApiAdjustment>('/api/inventory-adjustment-requests', dto)
    )
    return mapApiToDetail(raw)
  },

  async updateAdjustmentStatus(
    id: string,
    dto: UpdateInventoryAdjustmentStatusRequest
  ): Promise<InventoryAdjustmentDetail> {
    const raw = await requestData<ApiAdjustment>(() =>
      privateClient.patch<ApiAdjustment>(`/api/inventory-adjustment-requests/${id}/status`, {
        status: dto.status,
        reason: dto.rejectionReason ?? dto.note,
      })
    )
    return mapApiToDetail(raw)
  },

  async cancelAdjustment(id: string, dto: CancelInventoryAdjustmentRequest): Promise<InventoryAdjustmentDetail> {
    const raw = await requestData<ApiAdjustment>(() =>
      privateClient.post<ApiAdjustment>(`/api/inventory-adjustment-requests/${id}/cancel`, dto)
    )
    return mapApiToDetail(raw)
  },

  async getAllBookCopies(): Promise<SelectableBookCopy[]> {
    type CopyListResponse = {
      items?: {
        id: string
        copyBarcode: string
        titleName?: string | null
        editionStatement?: string | null
        status: BookCopyStatus
        shelfCode?: string | null
        sellingPrice?: number | null
      }[]
    }
    const response = await requestData<CopyListResponse>(() =>
      privateClient.get<CopyListResponse>('/api/book-copies', {
        params: { pageSize: 100 },
      })
    )
    return (response.items ?? []).map((c) => ({
      id: c.id,
      copyBarcode: c.copyBarcode,
      titleName: c.titleName ?? 'Không có tên',
      editionStatement: c.editionStatement,
      status: c.status,
      shelfCode: c.shelfCode,
      sellingPrice: c.sellingPrice,
    }))
  },
}
