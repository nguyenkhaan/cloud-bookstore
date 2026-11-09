import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { useCatalogBreadcrumbs } from '../catalog.hook'
import { catalogPaths } from '../catalog.route'

type CatalogWorkspaceProps = {
  action?: ReactNode
  children: ReactNode
  screenCode: string
  title: string
}

export function CatalogWorkspace({ action, children, screenCode, title }: CatalogWorkspaceProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const breadcrumbs = useCatalogBreadcrumbs()

  const navigateFromSidebar = (item: string) => {
    const path = workspacePathFor(item)
    if (path) navigate(path)
  }

  const currentUser = session?.user ?? { name: 'Khách', role: 'Chưa xác thực' }

  const isSeriesActive = location.pathname.startsWith(catalogPaths.seriesList)
  const isTitlesActive =
    !isSeriesActive &&
    (location.pathname.startsWith(catalogPaths.titleList) ||
      location.pathname.startsWith('/catalog/editions') ||
      location.pathname.startsWith('/catalog/copies'))

  return (
    <MainLayout
      actionButton={action}
      breadcrumbs={breadcrumbs}
      currentPath="inventory"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageTitle={title}
      screenCode={screenCode}
      user={currentUser}
    >
      <div className="space-y-5">
        <nav aria-label="Điều hướng catalog" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
          <Link
            aria-current={isSeriesActive ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              isSeriesActive
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            to={catalogPaths.seriesList}
          >
            Bộ sách
          </Link>
          <Link
            aria-current={isTitlesActive ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              isTitlesActive
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            to={catalogPaths.titleList}
          >
            Đầu sách
          </Link>
        </nav>
        {children}
      </div>
    </MainLayout>
  )
}
