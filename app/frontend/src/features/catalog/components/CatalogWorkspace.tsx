import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { catalogPaths } from '../catalog.route'

type CatalogWorkspaceProps = {
  action?: ReactNode
  children: ReactNode
  description: string
  screenCode: string
  title: string
}

export function CatalogWorkspace({ action, children, screenCode, title }: CatalogWorkspaceProps) {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()

  const navigateFromSidebar = (item: string) => {
    const path = workspacePathFor(item)
    if (path) navigate(path)
  }

  const currentUser = session?.user ?? { name: 'Khách', role: 'Chưa xác thực' }

  return (
    <MainLayout
      actionButton={action}
      breadcrumbs={['Không gian làm việc', 'Kho & đầu sách', title]}
      currentPath="inventory"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageTitle={title}
      screenCode={screenCode}
      user={currentUser}
    >
      <div className="space-y-5">
        <nav aria-label="Điều hướng catalog" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
          <Link className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" to={catalogPaths.seriesList}>
            Bộ sách
          </Link>
          <Link className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" to={catalogPaths.titleList}>
            Đầu sách
          </Link>
        </nav>
        {children}
      </div>
    </MainLayout>
  )
}
