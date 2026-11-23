import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { usePermissions } from '@/hooks/usePermissions'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { useCatalogBreadcrumbs } from '../catalog.hook'
import { catalogPaths } from '../catalog.route'
import { getVisibleCatalogTabs } from '../catalog-tabs'

type CatalogWorkspaceProps = {
  action?: ReactNode
  children: ReactNode
  title: string
}

export function CatalogWorkspace({ action, children, title }: CatalogWorkspaceProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const permissions = usePermissions()
  const breadcrumbs = useCatalogBreadcrumbs()
  const permissionStatus = permissions.isError
    ? 'error'
    : permissions.isPending
      ? 'loading'
      : 'ready'
  const visibleTabs = getVisibleCatalogTabs(
    session?.user?.roleCode,
    permissions.permissionCodes,
    permissionStatus,
  )

  const navigateFromSidebar = (item: string) => {
    const path = workspacePathFor(item)
    if (path) navigate(path)
  }

  const currentUser = session?.user ?? { name: 'Khách', role: 'Chưa xác thực' }

  const isCategoriesActive = location.pathname.startsWith(catalogPaths.categoryList)
  const isSeriesActive = location.pathname.startsWith(catalogPaths.seriesList)
  const isTitlesActive =
    !isCategoriesActive &&
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
      user={currentUser}
    >
      <div className="space-y-6">
        <nav aria-label="Điều hướng quản lý sách" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
          {visibleTabs.map((tab) => {
            const isActive = tab.id === 'categories'
              ? isCategoriesActive
              : tab.id === 'series'
                ? isSeriesActive
                : isTitlesActive
            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                key={tab.id}
                to={tab.path}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
        {children}
      </div>
    </MainLayout>
  )
}
