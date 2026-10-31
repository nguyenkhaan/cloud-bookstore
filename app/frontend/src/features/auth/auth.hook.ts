import { useContext, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AuthContext } from '@/context/AuthProvider'
import {
  checkServerReady,
  getSession,
  login,
  logout,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  verify,
} from './auth.service'
import type {
  ForgotPasswordRequest,
  LoginRequest,
  ResendVerificationRequest,
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

export function useVerifyMutation() {
  return useMutation({
    mutationKey: ['auth', 'verify'],
    mutationFn: (request: VerifyRequest) => verify(request),
  })
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationKey: ['auth', 'verification-resend'],
    mutationFn: (request: ResendVerificationRequest) => resendVerification(request),
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
    mutationFn: logout,
  })
}

export function useSessionQuery() {
  return useQuery({
    queryKey: ['auth', 'session'],
    queryFn: getSession,
    retry: false,
  })
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth phải được dùng bên trong AuthProvider')
  return value
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
