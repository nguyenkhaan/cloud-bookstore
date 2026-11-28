import { useContext, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthContext, formatUser } from '@/context/AuthProvider'
import {
  changePassword,
  checkServerReady,
  getProfile,
  getSession,
  getSessions,
  login,
  logout,
  register,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  revokeOtherSessions,
  revokeSession,
  updateProfile,
  updateProfileAvatar,
  verify,
} from './auth.service'
import type {
  EmployeeProfileResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  ServerStatus,
  VerifyRequest,
} from './auth.type'

export const authKeys = {
  session: ['auth', 'session'] as const,
  profile: (id?: string) => ['auth', 'profile', id] as const,
  sessions: (id?: string) => ['auth', 'sessions', id] as const,
}

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
    queryKey: authKeys.session,
    queryFn: getSession,
    retry: false,
  })
}

export function useProfileQuery() {
  const id = useAuth().session?.user?.id
  return useQuery({ queryKey: authKeys.profile(id), queryFn: getProfile, retry: false })
}

function useApplyProfileUpdate() {
  const { updateSessionUser } = useAuth()
  const queryClient = useQueryClient()
  return async (profile: EmployeeProfileResponse) => {
    const key = authKeys.profile(profile.id)
    await queryClient.cancelQueries({ queryKey: key })
    queryClient.setQueryData(key, profile)
    updateSessionUser(formatUser(profile))
    void queryClient.invalidateQueries({ queryKey: authKeys.session })
  }
}

export function useUpdateProfileMutation() {
  return useMutation({ mutationFn: updateProfile, onSuccess: useApplyProfileUpdate() })
}

export function useUpdateProfileAvatarMutation() {
  return useMutation({ mutationFn: updateProfileAvatar, onSuccess: useApplyProfileUpdate() })
}

export function useChangePasswordMutation() {
  const id = useAuth().session?.user?.id
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.profile(id) })
      void queryClient.invalidateQueries({ queryKey: authKeys.sessions(id) })
      void queryClient.invalidateQueries({ queryKey: authKeys.session })
    },
  })
}

export function useSessionsQuery() {
  const id = useAuth().session?.user?.id
  return useQuery({ queryKey: authKeys.sessions(id), queryFn: getSessions, retry: false })
}

export function useRevokeSessionMutation() {
  const id = useAuth().session?.user?.id
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.sessions(id) }),
  })
}

export function useRevokeOtherSessionsMutation() {
  const id = useAuth().session?.user?.id
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.sessions(id) }),
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
