import axios from 'axios'
import { privateClient } from '@/api/client'
import type {
  AuditLogDetailResponse,
  AuditLogFilters,
  AuditLogMetadataResponse,
  PagedAuditLogs,
} from './audit.type'

export class AuditApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AuditApiError'
    this.status = status
  }
}

function toMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined
    if (data && typeof data.detail === 'string') return data.detail
    if (data && typeof data.message === 'string') return data.message
    if (data && typeof data.title === 'string') return data.title
    return error.message
  }
  return error instanceof Error ? error.message : 'Không thể tải nhật ký kiểm toán.'
}

function toVnBoundaryIso(dateStr: string, endOfDay: boolean): string {
  return endOfDay ? `${dateStr}T23:59:59.999+07:00` : `${dateStr}T00:00:00.000+07:00`
}

export async function getAuditLogs(filters: AuditLogFilters): Promise<PagedAuditLogs> {
  try {
    const params: Record<string, string | number> = {
      Page: filters.page,
      PageSize: filters.pageSize,
    }
    if (filters.search?.trim()) params.Search = filters.search.trim()
    if (filters.entityType) params.EntityType = filters.entityType
    if (filters.action) params.Action = filters.action
    if (filters.fromDate) params.From = toVnBoundaryIso(filters.fromDate, false)
    if (filters.toDate) params.To = toVnBoundaryIso(filters.toDate, true)

    const response = await privateClient.get<PagedAuditLogs>('/audit', { params })
    return response.data
  } catch (error) {
    throw new AuditApiError(axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0, toMessage(error))
  }
}

export async function getAuditLogDetail(id: string): Promise<AuditLogDetailResponse> {
  try {
    const response = await privateClient.get<AuditLogDetailResponse>(`/audit/${encodeURIComponent(id)}`)
    return response.data
  } catch (error) {
    throw new AuditApiError(axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0, toMessage(error))
  }
}

export async function getAuditMetadata(): Promise<AuditLogMetadataResponse> {
  try {
    const response = await privateClient.get<AuditLogMetadataResponse>('/audit/metadata')
    return response.data
  } catch (error) {
    throw new AuditApiError(axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0, toMessage(error))
  }
}
