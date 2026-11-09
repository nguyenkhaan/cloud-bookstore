import { createContext } from 'react'

export type AuthUser = {
  name: string
  role: string
  roleCode?: string
  email?: string
  avatarUrl?: string
}

export type AuthSession = {
  authenticated: true
  user?: AuthUser
}

export function mapRoleToDisplay(role?: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Quản trị viên'
    case 'CASHIER':
      return 'Nhân viên'
    case 'INVENTORY_MANAGER':
      return 'Quản lý kho'
    default:
      return role || 'Người dùng'
  }
}

export function formatUser(
    raw?: { fullName?: string | null; role?: string | null; email?: string | null; avatarUrl?: string | null } | null,
): AuthUser {
  if (!raw) {
    return { name: 'Quản trị viên', role: 'Quản trị viên' }
  }
  return {
    name: raw.fullName || raw.email || 'Người dùng',
    role: mapRoleToDisplay(raw.role ?? undefined),
    roleCode: raw.role ?? undefined,
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