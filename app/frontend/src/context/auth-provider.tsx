import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  clearCsrfToken,
  getCsrfToken,
  persistStoredUser,
  removeStoredUser,
  setSessionExpiredHandler,
} from '@/api/client'
import { AuthContext, formatUser } from './AuthProvider'
import type { AuthContextValue, AuthSession } from './AuthProvider'
import { useLoginMutation, useLogoutMutation } from '@/features/auth/auth.hook'
import { ApiError, getSession } from '@/features/auth/auth.service'

type SessionCheck = 'initializing' | 'unavailable' | 'retrying' | 'complete'

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [sessionCheck, setSessionCheck] = useState<SessionCheck>('initializing')
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
    if (sessionCheck !== 'initializing' && sessionCheck !== 'retrying') return

    let active = true

    void getSession()
      .then((sessionData) => {
        if (active) {
          const user = sessionData?.user ? formatUser(sessionData.user) : null
          if (user?.roleCode) {
            persistStoredUser({ ...user, roleCode: user.roleCode })
            setSession({ authenticated: true, user })
          } else {
            removeStoredUser()
            setSession(null)
          }
          setSessionCheck('complete')
        }
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 503) {
          setSessionCheck('unavailable')
          return
        }
        clearSession()
        setSessionCheck('complete')
      })

    return () => {
      active = false
    }
  }, [clearSession, sessionCheck])

  const retrySession = useCallback(() => {
    setSessionCheck((current) => current === 'unavailable' ? 'retrying' : current)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await requestLogin({ email: email.trim(), password })
    const user = response?.user ? formatUser(response.user) : formatUser({ email: email.trim() })
    if (user.roleCode) persistStoredUser({ ...user, roleCode: user.roleCode })
    setSession({ authenticated: true, user })
  }, [requestLogin])

  const signOut = useCallback(async () => {
    let destination = '/login?logout=incomplete'
    try {
      const outcome = await requestLogout(getCsrfToken()).catch(() => null)
      if (outcome?.cookiesCleared) {
        destination = outcome.revocationCompleted ? '/login' : '/login?logout=partial'
      }
    } finally {
      startTransition(() => {
        clearSession()
        navigate(destination, { replace: true })
      })
    }
  }, [clearSession, navigate, requestLogout])

  const updateSessionUser = useCallback<AuthContextValue['updateSessionUser']>((user) => {
    if (!user.id || user.id !== session?.user?.id) return
    if (user.roleCode) persistStoredUser({ ...user, roleCode: user.roleCode })
    setSession((current) => current?.user?.id === user.id ? { authenticated: true, user } : current)
  }, [session?.user?.id])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isInitializing: sessionCheck === 'initializing' || sessionCheck === 'retrying',
      isSessionUnavailable: sessionCheck === 'unavailable' || sessionCheck === 'retrying',
      retrySession,
      login,
      signOut,
      updateSessionUser,
    }),
    [session, sessionCheck, retrySession, login, signOut, updateSessionUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
