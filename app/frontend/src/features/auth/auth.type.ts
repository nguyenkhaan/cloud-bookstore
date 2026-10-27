export type AccountInfo = { fullName: string; email: string; phone: string }

export type LoginTokens = { accessToken: string; refreshToken: string }

export type NoticeTone = 'warning' | 'error' | 'success' | 'info'

export type Notice = { tone: NoticeTone; message: string }

export type RegisterInput = AccountInfo & { password: string }

export type ServerStatus = 'checking' | 'online' | 'offline'
