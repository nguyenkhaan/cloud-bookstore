import type { components } from '@/contract/api-contract'

export type LoginRequest = components['schemas']['LoginRequest']
export type RegisterRequest = components['schemas']['RegisterRequest']
export type VerifyRequest = components['schemas']['VerifyRequest']
export type ForgotPasswordRequest = components['schemas']['ForgotPasswordRequest']
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest']
export type LogoutRequest = components['schemas']['LogoutRequest']

export type LoginResponse = { accessToken: string; refreshToken: string }
export type RegisterResponse = { email: string; fullName: string }

export type AccountInfo = { fullName: string; email: string; phone: string }

export type NoticeTone = 'warning' | 'error' | 'success' | 'info'

export type Notice = { tone: NoticeTone; message: string }

export type ServerStatus = 'checking' | 'online' | 'offline'
