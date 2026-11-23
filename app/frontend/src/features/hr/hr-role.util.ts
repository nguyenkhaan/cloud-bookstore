import { normalizeRoleCode } from '@/features/auth/role'
import type { AppRole } from '@/features/auth/role'

export type HrRoleCode = AppRole

const ROLE_LABELS: Record<HrRoleCode, string> = {
  ADMIN: 'Quản trị viên',
  INVENTORY_MANAGER: 'Quản lý kho',
  CASHIER: 'Thu ngân',
}

export function resolveHrRoleCode(
  user?: { role?: string; roleCode?: string } | null,
): HrRoleCode | undefined {
  return normalizeRoleCode(user?.roleCode) ?? undefined
}

export function isHrAdmin(roleCode?: string | null): boolean {
  return normalizeRoleCode(roleCode) === 'ADMIN'
}

export function formatHrRoleLabel(roleCode?: HrRoleCode): string {
  return roleCode ? ROLE_LABELS[roleCode] : 'Người dùng'
}
