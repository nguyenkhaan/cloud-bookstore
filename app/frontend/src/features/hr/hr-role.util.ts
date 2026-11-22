import { normalizeRoleCode } from '@/features/auth/role'
import type { AppRole } from '@/features/auth/role'

export type HrRoleCode = AppRole

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

export function getPreviewRoleFromSearch(search?: string): HrRoleCode | undefined {
  void search
  return undefined
}

export function resolveHrRoleCode(
  user?: { role?: string; roleCode?: string } | null,
  search?: string,
): HrRoleCode | undefined {
  void search
  const directCode = normalizeRoleCode(user?.roleCode)
  if (directCode) return directCode

  const displayRole = user?.role?.toLowerCase() ?? ''
  if (displayRole.includes('quản lý kho') || displayRole.includes('kho')) return 'INVENTORY_MANAGER'
  if (displayRole.includes('admin') || displayRole.includes('quản trị')) return 'ADMIN'
  if (displayRole.includes('nhân viên') || displayRole.includes('thu ngân')) return 'CASHIER'
  return undefined
}

export function isHrAdmin(roleCode?: string | null): boolean {
  return normalizeRoleCode(roleCode) === 'ADMIN'
}

export function formatHrRoleLabel(roleCode?: HrRoleCode): string {
  return roleCode ? ROLE_LABELS[roleCode] : 'Người dùng'
}
