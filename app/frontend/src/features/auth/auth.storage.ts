import { isAccessTokenUsable } from './session.ts'

export const AUTH_STORAGE_KEY = 'cloud-bookstore.auth.session'

export type AuthSession = {
  accessToken: string
  refreshToken: string
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function isAuthSession(value: unknown): value is AuthSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    'accessToken' in value &&
    typeof value.accessToken === 'string' &&
    'refreshToken' in value &&
    typeof value.refreshToken === 'string' &&
    isAccessTokenUsable(value.accessToken)
  )
}

export function readStoredSession(storage: StorageLike): AuthSession | null {
  try {
    const value = storage.getItem(AUTH_STORAGE_KEY)
    if (!value) return null
    const session: unknown = JSON.parse(value)
    if (isAuthSession(session)) return session
  } catch {
    // Invalid test data is handled like an expired session.
  }

  storage.removeItem(AUTH_STORAGE_KEY)
  return null
}

export function writeStoredSession(storage: StorageLike, session: AuthSession): void {
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession(storage: StorageLike): void {
  storage.removeItem(AUTH_STORAGE_KEY)
}
