import { useMemo } from 'react'
import { useAuth } from '@/features/auth/auth.hook'
import { usePermissions } from './usePermissions'
import {
  canReadAccess,
  canUpdateAccess,
  resolveEffectiveScreenAccess,
} from '@/routes/screen-access.policy'
import type { AccessLevel, ScreenId } from '@/routes/screen-access.policy'
import type { AppRole } from '@/features/auth/role'

export type ScreenAccessResult = {
  access: AccessLevel
  canRead: boolean
  canUpdate: boolean
  isResolving: boolean
  permissionsError: boolean
}

export function useScreenAccess(screenId: ScreenId): ScreenAccessResult {
  const { session } = useAuth()
  const permissions = usePermissions()
  const role = (session?.user?.roleCode ?? null) as AppRole | null
  const permissionStatus = permissions.isError
    ? 'error'
    : permissions.isPending
      ? 'loading'
      : 'ready'

  const access = useMemo(
    () => resolveEffectiveScreenAccess(screenId, role, permissions.permissionCodes, permissionStatus),
    [permissions.permissionCodes, permissionStatus, role, screenId],
  )

  return {
    access,
    canRead: canReadAccess(access),
    canUpdate: canUpdateAccess(access),
    isResolving: permissionStatus === 'loading',
    permissionsError: permissions.isError,
  }
}
