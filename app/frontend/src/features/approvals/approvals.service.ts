import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import { privateClient } from '@/api/client'
import type {
  BookCopyStatus,
  CancelInventoryAdjustmentRequest,
  CreateInventoryAdjustmentRequest,
  InventoryAdjustmentDetail,
  InventoryAdjustmentItem,
  InventoryAdjustmentQuery,
  InventoryAdjustmentStats,
  InventoryAdjustmentStatus,
  InventoryVarianceType,
  PagedResult,
  SelectableBookCopy,
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
  totalPages?: number
}

function toItem(raw: ApiAdjustment): InventoryAdjustmentItem {
  return {
    id: raw.id,
    requestCode: raw.checkCode || raw.id.slice(0, 8).toUpperCase(),
    inventoryCheckId: raw.inventoryCheckId ?? null,
    copyId: raw.copyId,
    copyBarcode: raw.copyBarcode,
    titleName: raw.titleName ?? '',
    editionStatement: raw.isbn ? `ISBN ${raw.isbn}` : null,
    originalStatus: raw.expectedStatus ?? raw.currentCopyStatus,
    requestedStatus: raw.requestedStatus,
    varianceType: raw.varianceType ?? 'NONE',
    status: raw.status,
    reason: raw.reason ?? '',
    requestedBy: raw.requestedBy,
    requestedByName: raw.requestedByName ?? null,
    requestedAt: raw.requestedAt,
    resolvedBy: raw.approvedBy ?? null,
    resolvedByName: raw.approvedByName ?? null,
    resolvedAt: raw.appliedAt ?? raw.approvedAt ?? null,
  }
}

function toDetail(raw: ApiAdjustment): InventoryAdjustmentDetail {
  const history = raw.history ?? []
  return {
    ...toItem(raw),
    checkCode: raw.checkCode ?? null,
    checkNote: raw.checkNote ?? null,
    auditLogs: history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      performedBy: entry.actorId ?? null,
      performedByName: entry.actorName ?? null,
      timestamp: entry.occurredAt,
      details: entry.reason ?? null,
    })),
  }
}

export const approvalsService = {
  async getAdjustments(query: InventoryAdjustmentQuery = {}): Promise<PagedResult<InventoryAdjustmentItem>> {
    const raw = await approvalsService.getAdjustmentsRaw(query)
    return {
      items: (raw.items ?? []).map(toItem),
      page: raw.page ?? 1,
      pageSize: raw.pageSize ?? 10,
      totalCount: raw.totalCount ?? 0,
      totalPages: raw.totalPages ?? 0,
    }
  },

  getAdjustmentsRaw(query: InventoryAdjustmentQuery = {}): Promise<ApiPaged<ApiAdjustment>> {
    const params = new URLSearchParams()
    if (query.page) params.set('page', String(query.page))
    if (query.pageSize) params.set('pageSize', String(query.pageSize))
    if (query.status) params.set('status', query.status)
    if (query.requestedStatus) params.set('requestedStatus', query.requestedStatus)
    if (query.varianceType) params.set('varianceType', query.varianceType)
    if (query.copyId) params.set('copyId', query.copyId)
    if (query.requestedBy) params.set('requestedBy', query.requestedBy)
    if (query.search?.trim()) params.set('search', query.search.trim())
    if (query.from) params.set('from', query.from)
    if (query.to) params.set('to', query.to)

    const queryString = params.toString()
    const url = `/inventory-adjustment-requests${queryString ? `?${queryString}` : ''}`
    return requestData(() => privateClient.get<ApiPaged<ApiAdjustment>>(url))
  },

  async getStats(): Promise<InventoryAdjustmentStats> {
    const raw = await requestData(() => privateClient.get<ApiStats>('/inventory-adjustment-requests/stats'))
    return {
      total: raw.totalCount ?? 0,
      pendingApproval: raw.pendingCount ?? 0,
      approved: raw.approvedCount ?? 0,
      applied: raw.appliedCount ?? 0,
      rejected: raw.rejectedCount ?? 0,
      cancelled: raw.cancelledCount ?? 0,
    }
  },

  async getAdjustmentDetail(id: string): Promise<InventoryAdjustmentDetail> {
    const raw = await requestData(() =>
      privateClient.get<ApiAdjustment>(`/inventory-adjustment-requests/${encodeURIComponent(id)}`),
    )
    return toDetail(raw)
  },

  async createAdjustment(dto: CreateInventoryAdjustmentRequest): Promise<InventoryAdjustmentItem> {
    const raw = await requestData(() => privateClient.post<ApiAdjustment>('/inventory-adjustment-requests', dto))
    return toItem(raw)
  },

  async updateAdjustmentStatus(id: string, dto: UpdateInventoryAdjustmentStatusRequest): Promise<InventoryAdjustmentItem> {
    const raw = await requestData(() =>
      privateClient.patch<ApiAdjustment>(`/inventory-adjustment-requests/${encodeURIComponent(id)}/status`, dto),
    )
    return toItem(raw)
  },

  async cancelAdjustment(id: string, dto: CancelInventoryAdjustmentRequest): Promise<InventoryAdjustmentItem> {
    const raw = await requestData(() =>
      privateClient.post<ApiAdjustment>(`/inventory-adjustment-requests/${encodeURIComponent(id)}/cancel`, dto),
    )
    return toItem(raw)
  },

  async getAllBookCopies(): Promise<SelectableBookCopy[]> {
    const firstPage = await requestData(() =>
      privateClient.get<ApiPaged<SelectableBookCopy>>('/book-copies?Page=1&PageSize=100'),
    )
    const allItems: SelectableBookCopy[] = [...(firstPage.items ?? [])]
    const totalPages = firstPage.totalPages ?? 1
    for (let page = 2; page <= totalPages; page++) {
      const nextPage = await requestData(() =>
        privateClient.get<ApiPaged<SelectableBookCopy>>(`/book-copies?Page=${page}&PageSize=100`),
      )
      if (nextPage.items) {
        allItems.push(...nextPage.items)
      }
    }
    return allItems.sort((a, b) => a.copyBarcode.localeCompare(b.copyBarcode))
  },
}
