import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import { privateClient } from '@/api/client'
import type {
  CancelInventoryAdjustmentRequest,
  CreateInventoryAdjustmentRequest,
  InventoryAdjustmentDetail,
  InventoryAdjustmentItem,
  InventoryAdjustmentQuery,
  InventoryAdjustmentStats,
  PagedResult,
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

export const approvalsService = {
  getAdjustments(query: InventoryAdjustmentQuery = {}): Promise<PagedResult<InventoryAdjustmentItem>> {
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
    return requestData(() => privateClient.get<PagedResult<InventoryAdjustmentItem>>(url))
  },

  getStats(): Promise<InventoryAdjustmentStats> {
    return requestData(() => privateClient.get<InventoryAdjustmentStats>('/inventory-adjustment-requests/stats'))
  },

  getAdjustmentDetail(id: string): Promise<InventoryAdjustmentDetail> {
    return requestData(() => privateClient.get<InventoryAdjustmentDetail>(`/inventory-adjustment-requests/${encodeURIComponent(id)}`))
  },

  createAdjustment(dto: CreateInventoryAdjustmentRequest): Promise<InventoryAdjustmentItem> {
    return requestData(() => privateClient.post<InventoryAdjustmentItem>('/inventory-adjustment-requests', dto))
  },

  updateAdjustmentStatus(id: string, dto: UpdateInventoryAdjustmentStatusRequest): Promise<InventoryAdjustmentItem> {
    return requestData(() =>
      privateClient.patch<InventoryAdjustmentItem>(`/inventory-adjustment-requests/${encodeURIComponent(id)}/status`, dto),
    )
  },

  cancelAdjustment(id: string, dto: CancelInventoryAdjustmentRequest): Promise<InventoryAdjustmentItem> {
    return requestData(() =>
      privateClient.post<InventoryAdjustmentItem>(`/inventory-adjustment-requests/${encodeURIComponent(id)}/cancel`, dto),
    )
  },
}
