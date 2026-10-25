import { createContext } from 'react'
import type { LoginPayload, User } from '../types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
    user: User | null
    status: AuthStatus
    login: (payload: LoginPayload) => Promise<void>
    logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)