import { normalizeRoleCode } from '@/features/auth/role'
import { canReadAccess, resolveEffectiveScreenAccess } from '@/routes/screen-access.policy'
import type { AppRole } from '@/features/auth/role'
import { catalogPaths } from './catalog.route'

export const CATALOG_TABS = [
  { id: 'categories', label: 'Thể loại', path: catalogPaths.categoryList, screenId: 'catalogCategories' },
  { id: 'series', label: 'Bộ sách', path: catalogPaths.seriesList, screenId: 'catalogSeries' },
  { id: 'titles', label: 'Đầu sách', path: catalogPaths.titleList, screenId: 'catalogTitles' },
] as const

export type CatalogTabDefinition = (typeof CATALOG_TABS)[number]

export function getVisibleCatalogTabs(
  roleCode?: string | null,
  permissionCodes: ReadonlySet<string> = new Set<string>(),
  permissionStatus: 'loading' | 'ready' | 'error' = 'ready',
): readonly CatalogTabDefinition[] {
  const role = normalizeRoleCode(roleCode) as AppRole | null
  return CATALOG_TABS.filter((tab) => canReadAccess(
    resolveEffectiveScreenAccess(tab.screenId, role, permissionCodes, permissionStatus),
  ))
}
