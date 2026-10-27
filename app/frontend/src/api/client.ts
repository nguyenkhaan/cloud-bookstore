import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

const backendUrl = import.meta.env.VITE_BASE_URL.replace(/\/+$/, '')
const API_BASE_URL = backendUrl.endsWith('/api')
  ? backendUrl
  : `${backendUrl}/api`
const CSRF_HEADER = 'X-CSRF-Token'
const UNSAFE_METHODS = new Set(['delete', 'patch', 'post', 'put'])
const AUTH_ENDPOINTS = new Set(['/auth/login', '/auth/logout', '/auth/refresh'])

type RetryableRequest = InternalAxiosRequestConfig & { _sessionRetried?: boolean }
type SessionRecovery = () => Promise<void>
type SessionExpiredHandler = () => void

let csrfToken: string | null = null
let refreshInFlight: Promise<void> | null = null
let sessionRecovery: SessionRecovery | null = null
let sessionExpiredHandler: SessionExpiredHandler | null = null

export function setCsrfToken(token: string): void {
  csrfToken = token
}

export function getCsrfToken(): string | null {
  return csrfToken
}

export function clearCsrfToken(): void {
  csrfToken = null
}

export function setSessionRecovery(recovery: SessionRecovery | null): void {
  sessionRecovery = recovery
}

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  sessionExpiredHandler = handler
}

function createClient() {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
    withCredentials: true,
  })

  client.interceptors.request.use((config) => {
    if (csrfToken && UNSAFE_METHODS.has(config.method?.toLowerCase() ?? 'get')) {
      config.headers.set(CSRF_HEADER, csrfToken)
    }
    return config
  })

  return client
}

async function recoverSession(): Promise<void> {
  if (!sessionRecovery) {
    throw new Error('Session recovery is not configured')
  }

  refreshInFlight ??= sessionRecovery().finally(() => {
    refreshInFlight = null
  })
  await refreshInFlight
}

export const publicClient = createClient()
export const privateClient = createClient()

privateClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<unknown>) => {
    const request = error.config as RetryableRequest | undefined
    const isAuthenticationEndpoint = AUTH_ENDPOINTS.has(String(request?.url))
    if (
      error.response?.status !== 401 ||
      !request ||
      request._sessionRetried ||
      isAuthenticationEndpoint
    ) {
      return Promise.reject(error)
    }

    try {
      await recoverSession()
      request._sessionRetried = true
      return privateClient.request(request)
    } catch {
      clearCsrfToken()
      sessionExpiredHandler?.()
      return Promise.reject(error)
    }
  },
)
