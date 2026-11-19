import type { components } from '@/contract/api-contract'

export type LoginRequest = components['schemas']['LoginRequest']
export type RegisterRequest = components['schemas']['RegisterRequest']
export type VerifyRequest = components['schemas']['VerifyRequest']
export type ResendVerificationRequest = components['schemas']['ResendVerificationRequest']
export type ForgotPasswordRequest = components['schemas']['ForgotPasswordRequest']
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest']
export type BrowserSessionResponse = components['schemas']['BrowserSessionResponse']
export type BrowserSessionUser = components['schemas']['BrowserSessionUser']

export type NoticeTone = 'warning' | 'error' | 'success' | 'info'

export type Notice = { tone: NoticeTone; message: string }

export type ServerStatus = 'checking' | 'online' | 'offline'

export type MockLoginDevice = {
  id: string
  name: string
  icon: 'desktop' | 'mobile' | 'laptop'
  isCurrent: boolean
  lastActive: string
  status: 'active' | 'logged_out'
}

export type MockNotificationPrefs = {
  systemSecurity: true
  shiftAndPos: boolean
  weeklyEmailDigest: boolean
}

export type MockProfileExtras = {
  username: string
  employeeCode: string
  branch: string
  joinedAt: string
  phone: string
  defaultShift: string
  lastPasswordChangedLabel: string
}
