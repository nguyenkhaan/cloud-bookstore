import { ApiError, apiUrl, postJson } from '../../../services/apiClient'

export type LoginTokens = { accessToken: string; refreshToken: string }
export type RegisterInput = { email: string; fullName: string; phone: string; password: string }

function isLoginTokens(payload: unknown): payload is LoginTokens {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'accessToken' in payload &&
    typeof payload.accessToken === 'string' &&
    'refreshToken' in payload &&
    typeof payload.refreshToken === 'string'
  )
}

export async function login(email: string, password: string): Promise<LoginTokens> {
  const payload = await postJson('/api/auth/login', { email: email.trim(), password })
  if (!isLoginTokens(payload)) throw new ApiError(502, 'Unexpected login response')
  return payload
}

export async function register(input: RegisterInput): Promise<void> {
  await postJson('/api/auth/register', input)
}

export async function verify(token: string): Promise<void> {
  await postJson('/api/auth/verify', { token })
}

export async function logout(refreshToken: string): Promise<void> {
  await postJson('/api/auth/logout', { refreshToken })
}

export async function checkServerReady(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(apiUrl('/api/health/readiness'), { signal })
    return response.ok
  } catch {
    return false
  }
}
