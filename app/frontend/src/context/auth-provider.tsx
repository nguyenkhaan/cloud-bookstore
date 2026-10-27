import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { clearCsrfToken, getCsrfToken, setSessionExpiredHandler } from '@/api/client'
import { AuthContext } from './AuthProvider'
import type { AuthContextValue, AuthSession } from './AuthProvider'
import { useLoginMutation, useLogoutMutation } from '@/features/auth/auth.hook'
import { getSession } from '@/features/auth/auth.service'

const authenticatedSession: AuthSession = { authenticated: true }

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const { mutateAsync: requestLogin } = useLoginMutation()
  const { mutate: requestLogout } = useLogoutMutation()
  const navigate = useNavigate()
  const location = useLocation()

  const clearSession = useCallback(() => {
    clearCsrfToken()
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
      .then(() => {
        if (active) setSession(authenticatedSession)
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
    await requestLogin({ email: email.trim(), password })
    setSession(authenticatedSession)
  }, [requestLogin])

  const signOut = useCallback(() => {
    requestLogout(getCsrfToken())
    clearSession()
    navigate('/login', { replace: true })
  }, [clearSession, navigate, requestLogout])

  const value = useMemo<AuthContextValue>(
    () => ({ session, isInitializing, login, signOut }),
    [session, isInitializing, login, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
