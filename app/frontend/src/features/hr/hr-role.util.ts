export type HrRoleCode = 'ADMIN' | 'INVENTORY_MANAGER' | 'CASHIER'

export const HR_ADMIN_ONLY_NAV_IDS = new Set([
  'approvals',
  'audit',
  'reports',
  'settings',
])

const ROLE_LABELS: Record<HrRoleCode, string> = {
  ADMIN: 'Quản trị viên',
  INVENTORY_MANAGER: 'Quản lý kho',
  CASHIER: 'Nhân viên',
}

function normalizeRoleCode(raw?: string | null): HrRoleCode | undefined {
  if (!raw) return undefined
  const value = raw.trim().toUpperCase()
  if (value === 'ADMIN' || value === 'SUPER_ADMIN') return 'ADMIN'
  if (value === 'INVENTORY_MANAGER' || value === 'WAREHOUSE') return 'INVENTORY_MANAGER'
  if (value === 'CASHIER' || value === 'EMPLOYEE') return 'CASHIER'
  return undefined
}

export function getPreviewRoleFromSearch(search?: string): HrRoleCode | undefined {
  if (!search) return undefined
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
    return normalizeRoleCode(params.get('previewRole'))
  } catch {
    return undefined
  }
}

export function resolveHrRoleCode(
  user?: { role?: string; roleCode?: string } | null,
  search?: string,
): HrRoleCode {
  const previewRole = getPreviewRoleFromSearch(search)
  if (previewRole) return previewRole

  const directCode = normalizeRoleCode(user?.roleCode)
  if (directCode) return directCode

  const displayRole = user?.role?.toLowerCase() ?? ''
  if (displayRole.includes('quản lý kho') || displayRole.includes('kho')) {
    return 'INVENTORY_MANAGER'
  }
  if (displayRole.includes('admin') || displayRole.includes('quản trị')) {
    return 'ADMIN'
  }
  if (displayRole.includes('nhân viên') || displayRole.includes('thu ngân')) {
    return 'CASHIER'
  }

  return 'ADMIN'
}

export function isHrAdmin(roleCode?: string | null): boolean {
  return normalizeRoleCode(roleCode) === 'ADMIN'
}

export function formatHrRoleLabel(roleCode: HrRoleCode): string {
  return ROLE_LABELS[roleCode]
}
