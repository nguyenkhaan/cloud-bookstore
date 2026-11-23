import { catalogPaths } from '@/features/catalog/catalog.route'
import { normalizeRoleCode } from '@/features/auth/role'
import { canReadAccess, getEffectiveAccess } from '@/routes/screen-access.policy'
import type { AppRole } from '@/features/auth/role'
import type { ScreenId } from '@/routes/screen-access.policy'

export const workspacePaths = {
  overview: '/dashboard',
  pos: '/pos',
  inventory: catalogPaths.seriesList,
  warehouse: catalogPaths.suppliers,
  customers: '/customers',
  hr: '/hr',
  approvals: '/approvals',
  audit: '/audit',
  reports: '/reports',
  settings: '/settings',
} as const

export type WorkspaceItem = keyof typeof workspacePaths

const workspaceScreenIds: Record<WorkspaceItem, readonly ScreenId[]> = {
  overview: ['dashboard'],
  pos: ['pos'],
  inventory: ['catalogCategories', 'catalogSeries', 'catalogTitles'],
  warehouse: ['suppliers', 'stockReceipts', 'stockOut', 'inventoryCheck', 'stockAlerts'],
  customers: ['customers'],
  hr: ['hr'],
  approvals: ['approvals'],
  audit: ['audit'],
  reports: ['reports'],
  settings: ['settings'],
}

export function workspacePathFor(item: string, roleCode?: string | null): string | undefined {
  const workspaceItem = item as WorkspaceItem
  const path = workspacePaths[workspaceItem]
  if (!path || roleCode === undefined || roleCode === null) return path

  const role = normalizeRoleCode(roleCode) as AppRole | null
  if (!role) return undefined

  const readable = workspaceScreenIds[workspaceItem].some((screenId) =>
    canReadAccess(getEffectiveAccess(screenId, role)),
  )
  return readable ? path : undefined
}
