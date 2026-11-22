import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { BreadcrumbItem } from '@/components/common/Breadcrumb'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { catalogPaths } from '../catalog.route'

type WarehouseWorkspaceProps = {
  action?: ReactNode
  children: ReactNode
  title: string
}

export function WarehouseWorkspace({ action, children, title }: WarehouseWorkspaceProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, signOut } = useAuth()

  const navigateFromSidebar = (item: string) => {
    const path = workspacePathFor(item)
    if (path) navigate(path)
  }

  const currentUser = session?.user ?? { name: 'Khách', role: 'Chưa xác thực' }

  const isSuppliersActive = location.pathname.startsWith(catalogPaths.suppliers)
  const isStockReceiptsActive = location.pathname.startsWith(catalogPaths.stockReceipts)
  const isStockOutActive = location.pathname.startsWith(catalogPaths.stockOut)
  const isCheckActive = location.pathname.startsWith(catalogPaths.inventoryCheck)
  const isAlertsActive = location.pathname.startsWith(catalogPaths.stockAlerts)

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'NCC & Kho', to: catalogPaths.suppliers },
    { label: title },
  ]

  return (
    <MainLayout
      actionButton={action}
      breadcrumbs={breadcrumbs}
      currentPath="warehouse"
      onNavigate={navigateFromSidebar}
      onSignOut={signOut}
      pageTitle={title}
      user={currentUser}
    >
      <div className="space-y-6">
        <nav aria-label="Điều hướng NCC và Kho" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
          <Link
            aria-current={isSuppliersActive ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              isSuppliersActive
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            to={catalogPaths.suppliers}
          >
            Nhà cung cấp
          </Link>
          <Link
            aria-current={isStockReceiptsActive ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              isStockReceiptsActive
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            to={catalogPaths.stockReceipts}
          >
            Nhập kho NCC
          </Link>
          <Link
            aria-current={isStockOutActive ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              isStockOutActive
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            to={catalogPaths.stockOut}
          >
            Xuất kho
          </Link>
          <Link
            aria-current={isCheckActive ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              isCheckActive
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            to={catalogPaths.inventoryCheck}
          >
            Kiểm kê kho
          </Link>
          <Link
            aria-current={isAlertsActive ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              isAlertsActive
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            to={catalogPaths.stockAlerts}
          >
            Cảnh báo tồn
          </Link>
        </nav>
        {children}
      </div>
    </MainLayout>
  )
}
