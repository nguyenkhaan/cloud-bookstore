import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import { privateClient, publicClient } from '@/api/client'
import type {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  RegisterRequest,
  RegisterResponse,
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
  register: '/auth/register',
  verify: '/auth/verify',
  passwordResetRequests: '/auth/password-reset-requests',
  passwordResets: '/auth/password-resets',
  logout: '/auth/logout',
  session: '/auth/session',
} as const

let accessToken: string | null = null

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

function isLoginResponse(value: unknown): value is LoginResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'accessToken' in value &&
    typeof value.accessToken === 'string' &&
    'refreshToken' in value &&
    typeof value.refreshToken === 'string'
  )
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await requestData(() => publicClient.post<unknown>(AUTH_ENDPOINTS.login, request))
  if (!isLoginResponse(response)) {
    throw new ApiError(502, 'Unexpected login response')
  }
  accessToken = response.accessToken
  return response
}

export async function register(request: RegisterRequest): Promise<RegisterResponse> {
  return requestData(() => publicClient.post<RegisterResponse>(AUTH_ENDPOINTS.register, request))
}

export async function verify(request: VerifyRequest): Promise<void> {
  await requestData(() => publicClient.post<void>(AUTH_ENDPOINTS.verify, request))
}

export async function requestPasswordReset(request: ForgotPasswordRequest): Promise<void> {
  await requestData(() => publicClient.post<void>(AUTH_ENDPOINTS.passwordResetRequests, request))
}

export async function resetPassword(request: ResetPasswordRequest): Promise<void> {
  await requestData(() => publicClient.post<void>(AUTH_ENDPOINTS.passwordResets, request))
}

export async function logout(request: LogoutRequest): Promise<void> {
  try {
    await requestData(() => publicClient.post<void>(AUTH_ENDPOINTS.logout, request))
  } finally {
    accessToken = null
  }
}

export async function getSession(): Promise<void> {
  await requestData(() =>
    privateClient.get<void>(AUTH_ENDPOINTS.session, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    }),
  )
}

export async function checkServerReady(signal?: AbortSignal): Promise<boolean> {
  try {
    await publicClient.get('/health/readiness', { signal })
    return true
  } catch {
    return false
  }
}
