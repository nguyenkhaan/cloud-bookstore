import type { components } from '@/contract/api-contract'

export type LoginRequest = components['schemas']['LoginRequest']
export type RegisterRequest = components['schemas']['RegisterRequest']
export type VerifyRequest = components['schemas']['VerifyRequest']
export type ResendVerificationRequest = components['schemas']['ResendVerificationRequest']
export type ForgotPasswordRequest = components['schemas']['ForgotPasswordRequest']
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest']
export type BrowserSessionResponse = components['schemas']['BrowserSessionResponse']
export type BrowserSessionUser = components['schemas']['BrowserSessionUser']
export type EmployeeProfileResponse = components['schemas']['EmployeeProfileResponse']
export type UpdateProfileRequest = components['schemas']['UpdateProfileRequest']
export type ChangePasswordRequest = components['schemas']['ChangePasswordRequest']
export type EmployeeSessionResponse = components['schemas']['EmployeeSessionResponse']
export type RevokeOtherSessionsResponse = components['schemas']['RevokeOtherSessionsResponse']

export type NoticeTone = 'warning' | 'error' | 'success' | 'info'

export type Notice = { tone: NoticeTone; message: string }

export type ServerStatus = 'checking' | 'online' | 'offline'
