import { createContext } from 'react'

export type AuthSession = { authenticated: true }

export type AuthContextValue = {
  session: AuthSession | null
  isInitializing: boolean
  login: (email: string, password: string) => Promise<void>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
