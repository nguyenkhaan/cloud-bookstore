import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth.hook'
import { getMyPermissions } from '@/features/settings/settings.service'

export const permissionKeys = ['role-permissions'] as const

export function usePermissions() {
  const { session } = useAuth()
  const query = useQuery({
    queryKey: [...permissionKeys, session?.user?.email, session?.user?.roleCode],
    queryFn: getMyPermissions,
    enabled: !!session,
    staleTime: 0,
    refetchInterval: 15_000,
  })
  return { ...query, can: (code: string) => !query.isError && query.data?.includes(code) === true }
}
