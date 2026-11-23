import { createContext } from 'react'
import { normalizeRoleCode } from '@/features/auth/role'
import type { AppRole } from '@/features/auth/role'

export type AuthUser = {
  id?: string
  name: string
  role: string
  roleCode?: AppRole
  email?: string
  avatarUrl?: string
}

export type AuthSession = {
  authenticated: true
  user?: AuthUser
}

export function mapRoleToDisplay(role?: string): string {
  switch (normalizeRoleCode(role)) {
    case 'ADMIN':
      return 'Quản trị viên'
    case 'CASHIER':
      return 'Thu ngân'
    case 'INVENTORY_MANAGER':
      return 'Quản lý kho'
    default:
      return role?.trim() || 'Người dùng'
  }
}

export function formatUser(
    raw?: {
      id?: string | null
      fullName?: string | null
      role?: string | null
      email?: string | null
      avatarUrl?: string | null
    } | null,
): AuthUser {
  if (!raw) {
    return { name: 'Người dùng', role: 'Người dùng' }
  }
  const roleCode = normalizeRoleCode(raw.role)
  return {
    id: raw.id ?? undefined,
    name: raw.fullName || raw.email || 'Người dùng',
    role: mapRoleToDisplay(raw.role ?? undefined),
    roleCode: roleCode ?? undefined,
    email: raw.email ?? undefined,
    avatarUrl: raw.avatarUrl ?? undefined,
  }
}

export type AuthContextValue = {
  session: AuthSession | null
  isInitializing: boolean
  login: (email: string, password: string) => Promise<void>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
