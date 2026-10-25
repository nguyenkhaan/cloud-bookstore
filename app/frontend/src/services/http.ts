import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_URL } from '../config/env'
import type { AccessTokenResponse } from '../types/auth'

// Access token chỉ nằm trong bộ nhớ (biến module): tải lại trang là mất,
// khi đó AuthProvider xin token mới bằng refresh cookie httpOnly.
let accessToken: string | null = null
let onSessionExpired: (() => void) | null = null

export const tokenStore = {
    get: () => accessToken,
    set: (token: string | null) => {
        accessToken = token
    },
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
    onSessionExpired = handler
}

export const http = axios.create({ baseURL: API_URL, withCredentials: true })

// Client riêng, không interceptor, để việc refresh không tự gọi lại chính nó.
const bare = axios.create({ baseURL: API_URL, withCredentials: true })

// Refresh token xoay vòng, dùng lại token cũ sẽ bị BE thu hồi mọi phiên.
// Vì vậy mọi lời gọi refresh đồng thời (nhiều request 401, React StrictMode) phải dùng chung 1 promise.
let refreshing: Promise<string> | null = null

export function refreshAccessToken(): Promise<string> {
    refreshing ??= bare
        .post<AccessTokenResponse>('/auth/refresh')
        .then((response) => {
            accessToken = response.data.accessToken
            return accessToken
        })
        .finally(() => {
            refreshing = null
        })
    return refreshing
}

http.interceptors.request.use((config) => {
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
    return config
})

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean }
const SKIP_REFRESH = ['/auth/login', '/auth/register', '/auth/verify', '/auth/refresh']

http.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as RetryableConfig | undefined
        const skip = !original || SKIP_REFRESH.some((path) => original.url?.startsWith(path))
        if (error.response?.status !== 401 || skip || original._retried) throw error

        original._retried = true
        try {
            await refreshAccessToken()
        } catch {
            accessToken = null
            onSessionExpired?.()
            throw error
        }
        return http(original)
    },
)