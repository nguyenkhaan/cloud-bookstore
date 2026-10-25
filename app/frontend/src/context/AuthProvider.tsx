import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../features/auth/services/authApi'
import { refreshAccessToken, setSessionExpiredHandler, tokenStore } from '../services/http'
import type { LoginPayload, User } from '../types/auth'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [status, setStatus] = useState<AuthStatus>('loading')

    // Khôi phục phiên: refresh cookie => access token mới => lấy hồ sơ.
    useEffect(() => {
        let active = true
        setSessionExpiredHandler(() => {
            setUser(null)
            setStatus('anonymous')
        })

        void (async () => {
            try {
                await refreshAccessToken()
                const profile = await authApi.me()
                if (active) {
                    setUser(profile)
                    setStatus('authenticated')
                }
            } catch {
                tokenStore.set(null)
                if (active) setStatus('anonymous')
            }
        })()

        return () => {
            active = false
            setSessionExpiredHandler(null)
        }
    }, [])

    const login = useCallback(async (payload: LoginPayload) => {
        await authApi.login(payload)
        const profile = await authApi.me()
        setUser(profile)
        setStatus('authenticated')
    }, [])

    const logout = useCallback(async () => {
        try {
            await authApi.logout()
        } catch {
            // Mất mạng hoặc phiên đã hết hạn: vẫn xóa phiên phía FE.
        }
        setUser(null)
        setStatus('anonymous')
    }, [])

    const value = useMemo<AuthContextValue>(
        () => ({ user, status, login, logout }),
        [user, status, login, logout],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}