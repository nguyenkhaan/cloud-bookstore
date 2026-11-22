export const APP_ROLES = ['ADMIN', 'CASHIER', 'INVENTORY_MANAGER'] as const

export type AppRole = (typeof APP_ROLES)[number]

const ROLE_ALIASES: Record<string, AppRole> = {
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'ADMIN',
  CASHIER: 'CASHIER',
  EMPLOYEE: 'CASHIER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  WAREHOUSE: 'INVENTORY_MANAGER',
}

export function normalizeRoleCode(value?: string | null): AppRole | null {
  if (typeof value !== 'string') return null
  return ROLE_ALIASES[value.trim().toUpperCase()] ?? null
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && APP_ROLES.includes(value as AppRole)
}
