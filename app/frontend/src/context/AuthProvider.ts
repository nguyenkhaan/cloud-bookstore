import { createContext } from 'react'
import type { AuthSession } from '@/features/auth/auth.storage'

export type { AuthSession } from '@/features/auth/auth.storage'

export type AuthContextValue = {
  session: AuthSession | null
  login: (email: string, password: string) => Promise<void>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
