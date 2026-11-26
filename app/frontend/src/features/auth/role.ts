export const APP_ROLES = ['ADMIN', 'CASHIER', 'INVENTORY_MANAGER'] as const

export type AppRole = (typeof APP_ROLES)[number]

const ROLE_ALIASES: Record<string, AppRole> = {
  ADMIN: 'ADMIN',
  CASHIER: 'CASHIER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
}

export function normalizeRoleCode(value?: string | null): AppRole | null {
  if (typeof value !== 'string') return null
  return ROLE_ALIASES[value.trim().toUpperCase()] ?? null
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && APP_ROLES.includes(value as AppRole)
}

export function getRoleBadgeLabel(roleCode?: string, fallbackRole = 'Người dùng nội bộ'): string {
  switch (roleCode) {
    case 'ADMIN': return 'Quản trị viên (Admin)'
    case 'CASHIER': return 'Thu ngân (Cashier)'
    case 'INVENTORY_MANAGER': return 'Quản lý kho (Inventory)'
    default: return fallbackRole
  }
}

export function getRolePermissionLabel(roleCode?: string, fallbackRole = 'Người dùng nội bộ'): string {
  switch (roleCode) {
    case 'ADMIN': return 'Quản trị viên (Toàn quyền)'
    case 'CASHIER': return 'Thu ngân (Quầy giao dịch)'
    case 'INVENTORY_MANAGER': return 'Quản lý kho (Kho & đầu sách)'
    default: return fallbackRole
  }
}
