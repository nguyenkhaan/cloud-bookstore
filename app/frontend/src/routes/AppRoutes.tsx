import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import LoginPage from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'
import VerifyRegisterPage from '@/features/auth/pages/VerifyRegisterPage'
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage'
import FirstChangePasswordPage from '@/features/auth/pages/FirstChangePasswordPage'
import ProfileSecurityPage from '@/features/auth/pages/ProfileSecurityPage'
import CopyDetailPage from '@/features/catalog/pages/CopyDetailPage'
import EditionDetailPage from '@/features/catalog/pages/EditionDetailPage'
import InventoryCheckPage from '@/features/catalog/pages/InventoryCheckPage'
import SeriesListPage from '@/features/catalog/pages/SeriesListPage'
import TitleDetailPage from '@/features/catalog/pages/TitleDetailPage'
import TitleListPage from '@/features/catalog/pages/TitleListPage'
import CustomerDetailPage from '@/features/customers/pages/CustomerDetailPage'
import CustomerListPage from '@/features/customers/pages/CustomerListPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import BookSeriesPage from '@/features/bookseries/pages/BookSeriesPage'
import PosPage from '@/features/pos/pages/PosPage'
import PosShiftPage from '@/features/pos/pages/PosShiftPage'
import PosCustomerDisplayPage from '@/features/pos/pages/PosCustomerDisplayPage'
import HumanResourcesPage from '@/features/hr/pages/HumanResourcesPage'
import ShiftRecordsPage from '@/features/hr/pages/ShiftRecordsPage'
import AttendancePage from '@/features/hr/pages/AttendancePage'
import AdminAttendancePage from '@/features/hr/pages/AdminAttendancePage'
import { adminHrPaths } from '@/features/hr/admin-hr.route'
import ApprovalsPage from '@/features/approvals/pages/ApprovalsPage'
import AuditPage from '@/features/audit/pages/AuditPage'
import CopyLifecycleLookupPage from '@/features/audit/pages/CopyLifecycleLookupPage'
import { auditPaths } from '@/features/audit/audit.route'
import ReportsPage from '@/features/reports/pages/ReportsPage'
import RevenueExpenseReportPage from '@/features/reports/pages/RevenueExpenseReportPage'
import DepositReconciliationPage from '@/features/reports/pages/DepositReconciliationPage'
import TaxDeclarationReportPage from '@/features/reports/pages/TaxDeclarationReportPage'
import { reportsPaths } from '@/features/reports/reports.route'
import SettingsPage from '@/features/settings/pages/SettingsPage'
import { MainLayout } from '@/components/layout'
import { Link, useNavigate } from 'react-router-dom'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { useAuth } from '@/features/auth/auth.hook'
import NotFound from '@/features/notfound/page';

function LoginRoute() {
  const { search } = useLocation()
  return <LoginPage search={search} />
}

function VerifyRegisterRoute() {
  const { search } = useLocation()
  return <VerifyRegisterPage search={search} />
}

function ResetPasswordRoute() {
  const { search } = useLocation()
  return <ResetPasswordPage search={search} />
}
function GuestOnly({children} : {children : ReactNode}) {
  const {session , isInitializing} = useAuth() 
  if (isInitializing) return null 
  if (session) 
    return <Navigate replace to={'/dashboard'} /> 
  return children
}
function RequireSession({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation()
  const { session, isInitializing } = useAuth()

  if (isInitializing) return null

  if (!session) {
    const next = encodeURIComponent(`${pathname}${search}`)
    return <Navigate replace to={`/login?next=${next}`} />
  }

  return children
}

function RequireRole({
  roles,
  currentPath,
  children,
}: {
  roles: string[]
  currentPath?: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const roleCode = (session?.user?.roleCode ?? '').toUpperCase()

  if (!roles.includes(roleCode)) {
    return (
      <MainLayout
        currentPath={currentPath}
        onNavigate={(id) => {
          const target = workspacePathFor(id)
          if (target) navigate(target)
        }}
        onSignOut={signOut}
        pageTitle="Không có quyền truy cập"
        breadcrumbs={[{ label: 'Không gian làm việc', to: '/dashboard' }, { label: 'Hạn chế quyền (403)' }]}
      >
        <div
          role="alert"
          className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-2xs"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-lg font-bold text-rose-600">
            403
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Bạn không có quyền truy cập trang này
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Chức năng này chỉ dành cho vai trò được phân quyền ({roles.join(', ')}). Vui lòng liên hệ Quản trị viên nếu bạn cần cấp quyền.
          </p>
          <Link
            to="/dashboard"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Quay về Tổng quan
          </Link>
        </div>
      </MainLayout>
    )
  }

  return children
}

function DashboardRoute() {
  const { signOut } = useAuth()
  return <DashboardPage onSignOut={signOut} />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate replace to="/login" />} />
      <Route path="/login" element={<GuestOnly><LoginRoute /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="/verify-register" element={<GuestOnly><VerifyRegisterRoute /></GuestOnly>} />
      <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
      <Route path="/reset-password" element={<GuestOnly><ResetPasswordRoute /></GuestOnly>} />
      <Route path="/change-password" element={<RequireSession><FirstChangePasswordPage /></RequireSession>} />
      <Route path="/first-change-password" element={<RequireSession><FirstChangePasswordPage /></RequireSession>} />
      <Route path="/profile" element={<RequireSession><ProfileSecurityPage /></RequireSession>} />
      <Route path="/dashboard" element={<RequireSession><DashboardRoute /></RequireSession>} />
      <Route path="/pos" element={<RequireSession><PosPage /></RequireSession>} />
      <Route path="/pos/customer-display" element={<RequireSession><PosCustomerDisplayPage /></RequireSession>} />
      <Route path="/pos/shift" element={<RequireSession><PosShiftPage /></RequireSession>} />
      <Route path="/customers" element={<RequireSession><CustomerListPage /></RequireSession>} />
      <Route path="/customers/:id" element={<RequireSession><CustomerDetailPage /></RequireSession>} />
      <Route path="/hr" element={<RequireSession><HumanResourcesPage /></RequireSession>} />
      <Route path="/hr/shifts" element={<RequireSession><Navigate replace to={adminHrPaths.shifts} /></RequireSession>} />
      <Route path="/hr/attendance" element={<RequireSession><AttendancePage /></RequireSession>} />
      <Route path="/admin/hr" element={<RequireSession><Navigate replace to={adminHrPaths.attendance} /></RequireSession>} />
      <Route path="/admin/hr/attendance" element={<RequireSession><AdminAttendancePage /></RequireSession>} />
      <Route path="/admin/hr/shifts" element={<RequireSession><ShiftRecordsPage /></RequireSession>} />
      <Route path="/approvals" element={<RequireSession><ApprovalsPage /></RequireSession>} />
      <Route
        path={auditPaths.root}
        element={
          <RequireSession>
            <RequireRole roles={['ADMIN', 'INVENTORY_MANAGER']} currentPath="audit">
              <AuditPage />
            </RequireRole>
          </RequireSession>
        }
      />
      <Route
        path={auditPaths.copyLifecycle}
        element={
          <RequireSession>
            <RequireRole roles={['ADMIN', 'INVENTORY_MANAGER']} currentPath="audit">
              <CopyLifecycleLookupPage />
            </RequireRole>
          </RequireSession>
        }
      />
      <Route
        path={reportsPaths.root}
        element={
          <RequireSession>
            <RequireRole roles={['ADMIN']} currentPath="reports">
              <ReportsPage />
            </RequireRole>
          </RequireSession>
        }
      />
      <Route
        path={reportsPaths.revenueExpense}
        element={
          <RequireSession>
            <RequireRole roles={['ADMIN']} currentPath="reports">
              <RevenueExpenseReportPage />
            </RequireRole>
          </RequireSession>
        }
      />
      <Route
        path={reportsPaths.depositReconciliation}
        element={
          <RequireSession>
            <RequireRole roles={['ADMIN']} currentPath="reports">
              <DepositReconciliationPage />
            </RequireRole>
          </RequireSession>
        }
      />
      <Route
        path={reportsPaths.taxDeclaration}
        element={
          <RequireSession>
            <RequireRole roles={['ADMIN']} currentPath="reports">
              <TaxDeclarationReportPage />
            </RequireRole>
          </RequireSession>
        }
      />
      <Route path="/settings" element={<RequireSession><SettingsPage /></RequireSession>} />
      <Route path="/book-series" element={<RequireSession><BookSeriesPage /></RequireSession>} />
      <Route path="/catalog/series" element={<RequireSession><SeriesListPage /></RequireSession>} />
      <Route path="/catalog/titles" element={<RequireSession><TitleListPage /></RequireSession>} />
      <Route path="/catalog/titles/:titleId" element={<RequireSession><TitleDetailPage /></RequireSession>} />
      <Route path="/catalog/editions/:editionId" element={<RequireSession><EditionDetailPage /></RequireSession>} />
      <Route path="/catalog/copies/:copyId" element={<RequireSession><CopyDetailPage /></RequireSession>} />
      <Route path="/catalog/inventory-check" element={<RequireSession><InventoryCheckPage /></RequireSession>} />
      <Route path="*" element={<NotFound />} />  
    </Routes>
  )
}
