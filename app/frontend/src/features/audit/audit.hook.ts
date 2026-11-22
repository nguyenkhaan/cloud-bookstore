import { useQuery } from '@tanstack/react-query'
import { getAuditLogDetail, getAuditLogs, getAuditMetadata } from './audit.service'
import type { AuditLogFilters } from './audit.type'

export const auditQueryKeys = {
  all: ['audit'] as const,
  list: (filters: AuditLogFilters) => ['audit', 'list', filters] as const,
  detail: (id: string | null) => ['audit', 'detail', id] as const,
  metadata: () => ['audit', 'metadata'] as const,
}

export function useAuditLogsQuery(filters: AuditLogFilters) {
  return useQuery({
    queryKey: auditQueryKeys.list(filters),
    queryFn: () => getAuditLogs(filters),
  })
}

export function useAuditLogDetailQuery(id: string | null) {
  return useQuery({
    queryKey: auditQueryKeys.detail(id),
    queryFn: () => getAuditLogDetail(id!),
    enabled: Boolean(id),
  })
}

export function useAuditMetadataQuery() {
  return useQuery({
    queryKey: auditQueryKeys.metadata(),
    queryFn: getAuditMetadata,
  })
}
