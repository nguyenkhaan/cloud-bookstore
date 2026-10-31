import type { components } from '@/contract/api-contract'

export type LoginRequest = components['schemas']['LoginRequest']
export type VerifyRequest = components['schemas']['VerifyRequest']
export type ResendVerificationRequest = components['schemas']['ResendVerificationRequest']
export type ForgotPasswordRequest = components['schemas']['ForgotPasswordRequest']
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest']
export type BrowserSessionResponse = components['schemas']['BrowserSessionResponse']

export type NoticeTone = 'warning' | 'error' | 'success' | 'info'

export type Notice = { tone: NoticeTone; message: string }

export type ServerStatus = 'checking' | 'online' | 'offline'
