import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getAccessTokenExpiration, isAccessTokenUsable } from '@/tmp/auth/session'
import * as authApi from '@/tmp/features/auth/services/authApi'
import { navigate } from '@/tmp/routes/router'
import { ApiError } from '@/tmp/services/apiClient'
import { AuthContext } from '@/tmp/context/auth-context'
import type { AuthContextValue, Session } from '@/tmp/context/auth-context'

const revokeQuietly = (refreshToken: string) => {
    void authApi.logout(refreshToken).catch(() => undefined)
}

export function AuthProvider({ children }: { children: ReactNode }) {

    const [session, setSession] = useState<Session | null>(null)

    const login = useCallback(async (email: string, password: string) => {
        const tokens = await authApi.login(email, password)
        if (!isAccessTokenUsable(tokens.accessToken)) throw new ApiError(502, 'Unusable access token')
        setSession(tokens)
    }, [])

    const signOut = useCallback(() => {
        const refreshToken = session?.refreshToken
        setSession(null)
        navigate('/', true)
        if (refreshToken) revokeQuietly(refreshToken)
    }, [session])

    const accessToken = session?.accessToken
    const refreshToken = session?.refreshToken
    useEffect(() => {
        const expiration = getAccessTokenExpiration(accessToken)
        if (expiration === null) return
        const timeout = window.setTimeout(() => {
            setSession(null)
            if (refreshToken) revokeQuietly(refreshToken)
            const next = `${window.location.pathname}${window.location.search}`
            navigate(`/login?next=${encodeURIComponent(next)}`, true)
        }, Math.max(0, expiration - Date.now()))
        return () => window.clearTimeout(timeout)
    }, [accessToken, refreshToken])

    const value = useMemo<AuthContextValue>(() => ({ session, login, signOut }), [session, login, signOut])
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
