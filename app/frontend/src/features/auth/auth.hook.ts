import { useCallback, useContext, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AuthContext } from '@/tmp/context/auth-context'
import {
  checkServerReady,
  getSession,
  login,
  logout,
  register,
  requestPasswordReset,
  resetPassword,
  verify,
} from './auth.service'
import type {
  ForgotPasswordRequest,
  LoginRequest,
  LogoutRequest,
  RegisterRequest,
  ResetPasswordRequest,
  ServerStatus,
  VerifyRequest,
} from './auth.type'

export function useLoginMutation() {
  return useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: (request: LoginRequest) => login(request),
  })
}

export function useRegisterMutation() {
  return useMutation({
    mutationKey: ['auth', 'register'],
    mutationFn: (request: RegisterRequest) => register(request),
  })
}

export function useVerifyMutation() {
  return useMutation({
    mutationKey: ['auth', 'verify'],
    mutationFn: (request: VerifyRequest) => verify(request),
  })
}

export function useRequestPasswordResetMutation() {
  return useMutation({
    mutationKey: ['auth', 'password-reset-request'],
    mutationFn: (request: ForgotPasswordRequest) => requestPasswordReset(request),
  })
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationKey: ['auth', 'password-reset'],
    mutationFn: (request: ResetPasswordRequest) => resetPassword(request),
  })
}

export function useLogoutMutation() {
  return useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: (request: LogoutRequest) => logout(request),
  })
}

export function useSessionQuery() {
  return useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      await getSession()
      return true
    },
    retry: false,
  })
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth phải được dùng bên trong AuthProvider')
  return value
}

export function useCountdown() {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (remaining <= 0) return
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [remaining])

  const start = useCallback((seconds: number) => setRemaining(seconds), [])
  return { remaining, start }
}

export function useServerStatus(intervalMs = 30_000): ServerStatus {
  const [status, setStatus] = useState<ServerStatus>('checking')

  useEffect(() => {
    const controller = new AbortController()
    const check = async () => {
      const ready = await checkServerReady(controller.signal)
      if (!controller.signal.aborted) setStatus(ready ? 'online' : 'offline')
    }
    void check()
    const timer = window.setInterval(() => void check(), intervalMs)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [intervalMs])

  return status
}
