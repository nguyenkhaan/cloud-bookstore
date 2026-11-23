import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { useScreenAccess } from '@/hooks/useScreenAccess'
import type { ScreenId } from './screen-access.policy'

export type RoleGuardProps = {
  screenId: ScreenId
  children: ReactNode
}

export function RoleGuard({ screenId, children }: RoleGuardProps): ReactNode {
  const { pathname } = useLocation()
  const { canRead } = useScreenAccess(screenId)

  if (!canRead) {
    return <ForbiddenPage currentPath={pathname} />
  }

  return children
}

