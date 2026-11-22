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
import ReportsPage from '@/features/reports/pages/ReportsPage'
import SettingsPage from '@/features/settings/pages/SettingsPage'
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
      <Route path="/audit" element={<RequireSession><AuditPage /></RequireSession>} />
      <Route path="/reports" element={<RequireSession><ReportsPage /></RequireSession>} />
      <Route path="/settings" element={<RequireSession><SettingsPage /></RequireSession>} />
      <Route path="/settings/rental" element={<RequireSession><SettingsPage /></RequireSession>} />
      <Route path="/settings/tiers" element={<RequireSession><SettingsPage /></RequireSession>} />
      <Route path="/settings/rbac" element={<RequireSession><Navigate replace to="/admin/settings/rbac" /></RequireSession>} />
      <Route path="/settings/integrations" element={<RequireSession><Navigate replace to="/admin/settings/integrations" /></RequireSession>} />
      <Route path="/admin/settings/rbac" element={<RequireSession><SettingsPage /></RequireSession>} />
      <Route path="/admin/settings/integrations" element={<RequireSession><SettingsPage /></RequireSession>} />
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
