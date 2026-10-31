import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

const backendUrl = import.meta.env.VITE_BASE_URL.replace(/\/+$/, '')
const API_BASE_URL = backendUrl.endsWith('/api')
  ? backendUrl
  : `${backendUrl}/api`
const CSRF_HEADER = 'X-CSRF-Token'
const CSRF_STORAGE_KEY = 'cloud-bookstore.csrf-token'
const UNSAFE_METHODS = new Set(['delete', 'patch', 'post', 'put'])
const AUTH_ENDPOINTS = new Set(['/auth/login', '/auth/logout', '/auth/refresh'])

type RetryableRequest = InternalAxiosRequestConfig & { _sessionRetried?: boolean }
type SessionRecovery = () => Promise<void>
type SessionExpiredHandler = () => void

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function readStoredCsrfToken(): string | null {
  try {
    return getSessionStorage()?.getItem(CSRF_STORAGE_KEY) || null
  } catch {
    return null
  }
}

function persistCsrfToken(token: string): void {
  try {
    getSessionStorage()?.setItem(CSRF_STORAGE_KEY, token)
  } catch {
    // Keep the in-memory token when browser storage is unavailable.
  }
}

function removeStoredCsrfToken(): void {
  try {
    getSessionStorage()?.removeItem(CSRF_STORAGE_KEY)
  } catch {
    // The in-memory token has already been cleared.
  }
}

let csrfToken: string | null = readStoredCsrfToken()
let refreshInFlight: Promise<void> | null = null
let sessionRecovery: SessionRecovery | null = null
let sessionExpiredHandler: SessionExpiredHandler | null = null

export function setCsrfToken(token: string): void {
  csrfToken = token
  persistCsrfToken(token)
}

export function getCsrfToken(): string | null {
  return csrfToken
}

export function clearCsrfToken(): void {
  csrfToken = null
  removeStoredCsrfToken()
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
      !csrfToken ||
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
