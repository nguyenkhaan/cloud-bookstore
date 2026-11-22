import type { components } from '@/contract/api-contract'

export type AuditLogItem = components['schemas']['AuditLogResponse']
export type AuditLogDetailResponse = components['schemas']['AuditLogDetailResponse']
export type AuditLogMetadataResponse = components['schemas']['AuditLogMetadataResponse']
export type PagedAuditLogs = components['schemas']['PagedResultOfAuditLogResponse']

export type AuditLogFilters = {
  search?: string
  entityType?: string
  action?: string
  fromDate?: string
  toDate?: string
  page: number
  pageSize: number
}
