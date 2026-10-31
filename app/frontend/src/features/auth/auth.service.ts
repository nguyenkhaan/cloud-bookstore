import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import {
  clearCsrfToken,
  getCsrfToken,
  privateClient,
  publicClient,
  setCsrfToken,
  setSessionRecovery,
} from '@/api/client'
import type {
  BrowserSessionResponse,
  ForgotPasswordRequest,
  LoginRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  VerifyRequest,
} from './auth.type'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const AUTH_ENDPOINTS = {
  login: '/auth/login',
  refresh: '/auth/refresh',
  verify: '/auth/verify',
  verificationResends: '/auth/verification-resends',
  passwordResetRequests: '/auth/password-reset-requests',
  passwordResets: '/auth/password-resets',
  logout: '/auth/logout',
  session: '/auth/session',
} as const

let sessionRequestInFlight: Promise<BrowserSessionResponse> | null = null

function getErrorMessage(error: AxiosError<unknown>): string {
  const data = error.response?.data
  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message
  }
  return error.message
}

async function requestData<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
  try {
    return (await request()).data
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error
    throw new ApiError(error.response?.status ?? 0, getErrorMessage(error))
  }
}

function isBrowserSessionResponse(value: unknown): value is BrowserSessionResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'csrfToken' in value &&
    typeof value.csrfToken === 'string' &&
    value.csrfToken.length > 0
  )
}

function storeCsrfToken(response: unknown): BrowserSessionResponse {
  if (!isBrowserSessionResponse(response)) {
    throw new ApiError(502, 'Unexpected authentication response')
  }

  const session = { csrfToken: response.csrfToken }
  setCsrfToken(session.csrfToken)
  return session
}

export async function login(request: LoginRequest): Promise<BrowserSessionResponse> {
  return storeCsrfToken(
    await requestData(() => publicClient.post<unknown>(AUTH_ENDPOINTS.login, request)),
  )
}

export async function refreshSession(): Promise<BrowserSessionResponse> {
  return storeCsrfToken(
    await requestData(() => publicClient.post<unknown>(AUTH_ENDPOINTS.refresh)),
  )
}

setSessionRecovery(async () => {
  await refreshSession()
})

export async function verify(request: VerifyRequest): Promise<void> {
  await requestData(() => publicClient.post<void>(AUTH_ENDPOINTS.verify, request))
}

export async function resendVerification(request: ResendVerificationRequest): Promise<void> {
  await requestData(() => publicClient.post<void>(AUTH_ENDPOINTS.verificationResends, request))
}

export async function requestPasswordReset(request: ForgotPasswordRequest): Promise<void> {
  await requestData(() => publicClient.post<void>(AUTH_ENDPOINTS.passwordResetRequests, request))
}

export async function resetPassword(request: ResetPasswordRequest): Promise<void> {
  await requestData(() => publicClient.post<void>(AUTH_ENDPOINTS.passwordResets, request))
}

export async function logout(csrfToken = getCsrfToken()): Promise<void> {
  try {
    await requestData(() => publicClient.post<void>(AUTH_ENDPOINTS.logout, undefined, {
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
    }))
  } finally {
    clearCsrfToken()
  }
}

export function getSession(): Promise<BrowserSessionResponse> {
  sessionRequestInFlight ??= requestData(() => privateClient.get<unknown>(AUTH_ENDPOINTS.session))
    .then(storeCsrfToken)
    .finally(() => {
      sessionRequestInFlight = null
    })

  return sessionRequestInFlight
}

export async function checkServerReady(signal?: AbortSignal): Promise<boolean> {
  try {
    await publicClient.get('/health/readiness', { signal })
    return true
  } catch {
    return false
  }
}
