import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth.hook'
import { getMyPermissions } from '@/features/settings/settings.service'

export const permissionKeys = ['role-permissions'] as const

export function usePermissions() {
  const { session } = useAuth()
  const user = session?.user
  const query = useQuery({
    queryKey: [...permissionKeys, user?.id, user?.email, user?.roleCode],
    queryFn: getMyPermissions,
    enabled: !!session,
    staleTime: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  })
  const permissions = query.data ?? []
  const permissionCodes = new Set(permissions)
  return {
    ...query,
    permissions,
    permissionCodes,
    can: (code: string) => !query.isError && permissionCodes.has(code),
    canAny: (codes: readonly string[]) => !query.isError && codes.some((code) => permissionCodes.has(code)),
  }
}
