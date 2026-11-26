import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import type { components } from '@/contract/api-contract'
import {
  clearCsrfToken,
  isCsrfRejection,
  setCsrfRecovery,
  getCsrfToken,
  privateClient,
  publicClient,
  setCsrfToken,
  setSessionRecovery,
} from '@/api/client'
import type {
  BrowserSessionResponse,
  ChangePasswordRequest,
  EmployeeProfileResponse,
  EmployeeSessionResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  RevokeOtherSessionsResponse,
  UpdateProfileRequest,
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
  register: '/auth/register',
  refresh: '/auth/refresh',
  verify: '/auth/verify',
  verificationResends: '/auth/verification-resends',
  passwordResetRequests: '/auth/password-reset-requests',
  passwordResets: '/auth/password-resets',
  logout: '/auth/logout',
  session: '/auth/session',
  profile: '/auth/profile',
  avatar: '/auth/profile/avatar',
  changePassword: '/auth/change-password',
  sessions: '/auth/sessions',
} as const

let sessionRequestInFlight: Promise<BrowserSessionResponse> | null = null

function getErrorMessage(error: AxiosError<unknown>): string {
  const data = error.response?.data
  if (typeof data === 'object' && data !== null) {
    if ('message' in data && typeof data.message === 'string') return data.message
    if ('detail' in data && typeof data.detail === 'string') return data.detail
    if ('errors' in data && typeof data.errors === 'object' && data.errors !== null) {
      const message = Object.values(data.errors).flat().find((value): value is string => typeof value === 'string')
      if (message) return message
    }
  }
  return error.message
}

export function localizeAuthError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback
  const message = error.message.toLowerCase()
  if (message.includes('current password is incorrect')) return 'Mật khẩu hiện tại không chính xác.'
  if (message.includes('different from current password')) return 'Mật khẩu mới phải khác mật khẩu hiện tại.'
  if (message.includes('email domain')) return 'Tên miền email này không được phép đăng ký.'
  if (message.includes('email') && (message.includes('invalid') || message.includes('not valid'))) return 'Địa chỉ email không hợp lệ.'
  if (message.includes('12 to 128') || message.includes('newpassword')) {
    return 'Mật khẩu phải có 12 đến 128 ký tự, bao gồm chữ hoa, chữ số và ký tự đặc biệt.'
  }
  return fallback
}

export function isValidAuthEmail(email: string): boolean {
  return email.length <= 200 && /^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/.test(email)
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

  const session: BrowserSessionResponse = { csrfToken: response.csrfToken }
  if (response.user) {
    session.user = response.user
  }
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

setCsrfRecovery(async () => {
  await getSession()
})

export async function register(request: RegisterRequest): Promise<void> {
  await requestData(() => publicClient.post<void>(AUTH_ENDPOINTS.register, request))
}

export function getRegistrationDomains(): Promise<string[]> {
  return requestData(() => publicClient.get<string[]>(AUTH_ENDPOINTS.register))
}

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

function postLogout(csrfToken: string | null) {
  return publicClient.post<void>(AUTH_ENDPOINTS.logout, undefined, {
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
  })
}

export async function logout(csrfToken = getCsrfToken()): Promise<void> {
  try {
    await requestData(async () => {
      try {
        return await postLogout(csrfToken)
      } catch (error) {
        // A stale token (another tab read the session, or it was refreshed) would leave the
        // server session alive; reload the current token and try once more.
        if (!isCsrfRejection(error)) throw error
        const session = await getSession()
        return await postLogout(session.csrfToken)
      }
    })
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

export function getProfile(): Promise<EmployeeProfileResponse> {
  return requestData(() => privateClient.get<EmployeeProfileResponse>(AUTH_ENDPOINTS.profile))
}

export function updateProfile(request: UpdateProfileRequest): Promise<EmployeeProfileResponse> {
  return requestData(() => privateClient.put<EmployeeProfileResponse>(AUTH_ENDPOINTS.profile, request))
}

export function updateProfileAvatar(request: components['schemas']['CloudinaryUploadResultRequest']): Promise<EmployeeProfileResponse> {
  return requestData(() => privateClient.put<EmployeeProfileResponse>(AUTH_ENDPOINTS.avatar, request))
}

export async function changePassword(request: ChangePasswordRequest): Promise<void> {
  await requestData(() => privateClient.post<void>(AUTH_ENDPOINTS.changePassword, request))
}

export function getSessions(): Promise<EmployeeSessionResponse[]> {
  return requestData(() => privateClient.get<EmployeeSessionResponse[]>(AUTH_ENDPOINTS.sessions))
}

export async function revokeSession(sessionId: string): Promise<void> {
  await requestData(() => privateClient.delete<void>(`${AUTH_ENDPOINTS.sessions}/${encodeURIComponent(sessionId)}`))
}

export function revokeOtherSessions(): Promise<RevokeOtherSessionsResponse> {
  return requestData(() => privateClient.post<RevokeOtherSessionsResponse>(`${AUTH_ENDPOINTS.sessions}/revoke-others`))
}

export async function checkServerReady(signal?: AbortSignal): Promise<boolean> {
  try {
    await publicClient.get('/health/readiness', { signal })
    return true
  } catch {
    return false
  }
}
