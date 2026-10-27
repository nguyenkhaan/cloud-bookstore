import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from './AuthProvider'
import type { AuthContextValue, AuthSession } from './AuthProvider'
import { useLoginMutation, useLogoutMutation } from '@/features/auth/auth.hook'
import { clearStoredSession, readStoredSession, writeStoredSession } from '@/features/auth/auth.storage'
import { ApiError, setAccessToken } from '@/features/auth/auth.service'
import { getAccessTokenExpiration, isAccessTokenUsable } from '@/features/auth/session'

function initialSession(): AuthSession | null {
  return typeof window === 'undefined' ? null : readStoredSession(window.localStorage)
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(initialSession)
  const { mutateAsync: requestLogin } = useLoginMutation()
  const { mutate: requestLogout } = useLogoutMutation()
  const navigate = useNavigate()
  const location = useLocation()

  const clearSession = useCallback(() => {
    setSession(null)
    setAccessToken(null)
    clearStoredSession(window.localStorage)
  }, [])

  useLayoutEffect(() => {
    setAccessToken(session?.accessToken ?? null)
  }, [session?.accessToken])

  useEffect(() => {
    const expiration = getAccessTokenExpiration(session?.accessToken)
    if (expiration === null) return

    const timer = window.setTimeout(() => {
      const refreshToken = session?.refreshToken
      const next = `${location.pathname}${location.search}`
      clearSession()
      if (refreshToken) requestLogout({ refreshToken })
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true })
    }, Math.max(0, expiration - Date.now()))

    return () => window.clearTimeout(timer)
  }, [clearSession, location.pathname, location.search, navigate, requestLogout, session])

  const login = useCallback(async (email: string, password: string) => {
    const nextSession = await requestLogin({ email: email.trim(), password })
    if (!isAccessTokenUsable(nextSession.accessToken)) {
      throw new ApiError(502, 'Unusable access token')
    }
    writeStoredSession(window.localStorage, nextSession)
    setAccessToken(nextSession.accessToken)
    setSession(nextSession)
  }, [requestLogin])

  const signOut = useCallback(() => {
    const refreshToken = session?.refreshToken
    clearSession()
    navigate('/login', { replace: true })
    if (refreshToken) requestLogout({ refreshToken })
  }, [clearSession, navigate, requestLogout, session?.refreshToken])

  const value = useMemo<AuthContextValue>(() => ({ session, login, signOut }), [session, login, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
