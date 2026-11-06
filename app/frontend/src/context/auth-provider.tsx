import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  clearCsrfToken,
  getCsrfToken,
  persistStoredUser,
  readStoredUser,
  removeStoredUser,
  setSessionExpiredHandler,
} from '@/api/client'
import { AuthContext, formatUser } from './AuthProvider'
import type { AuthContextValue, AuthSession } from './AuthProvider'
import { useLoginMutation, useLogoutMutation } from '@/features/auth/auth.hook'
import { getSession } from '@/features/auth/auth.service'



export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const stored = readStoredUser()
    return stored ? { authenticated: true, user: stored } : null
  })
  const [isInitializing, setIsInitializing] = useState(true)
  const { mutateAsync: requestLogin } = useLoginMutation()
  const { mutateAsync: requestLogout } = useLogoutMutation()
  const navigate = useNavigate()
  const location = useLocation()

  const clearSession = useCallback(() => {
    clearCsrfToken()
    removeStoredUser()
    setSession(null)
  }, [])

  const redirectToLogin = useCallback(() => {
    clearSession()
    if (location.pathname === '/login') return

    const next = `${location.pathname}${location.search}`
    navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true })
  }, [clearSession, location.pathname, location.search, navigate])

  useEffect(() => {
    setSessionExpiredHandler(redirectToLogin)
    return () => setSessionExpiredHandler(null)
  }, [redirectToLogin])

  useEffect(() => {
    let active = true

    void getSession()
      .then((sessionData) => {
        if (active) {
          const user = sessionData?.user ? formatUser(sessionData.user) : (readStoredUser() ?? formatUser())
          persistStoredUser(user)
          setSession({ authenticated: true, user })
        }
      })
      .catch(() => {
        if (active) clearSession()
      })
      .finally(() => {
        if (active) setIsInitializing(false)
      })

    return () => {
      active = false
    }
  }, [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    const response = await requestLogin({ email: email.trim(), password })
    const user = response?.user ? formatUser(response.user) : formatUser({ email: email.trim() })
    persistStoredUser(user)
    setSession({ authenticated: true, user })
  }, [requestLogin])

  const signOut = useCallback(async () => {
    try {
      await requestLogout(getCsrfToken())
    } catch {
      // Local state is cleared regardless; the backend no longer lets a leftover cookie block login.
    } finally {
      clearSession()
      navigate('/login', { replace: true })
    }
  }, [clearSession, navigate, requestLogout])

  const value = useMemo<AuthContextValue>(
    () => ({ session, isInitializing, login, signOut }),
    [session, isInitializing, login, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
