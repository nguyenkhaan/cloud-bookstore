import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import LoginPage from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'
import VerifyRegisterPage from '@/features/auth/pages/VerifyRegisterPage'
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage'
import FirstChangePasswordPage from '@/features/auth/pages/FirstChangePasswordPage'
import ProfileSecurityPage from '@/features/auth/pages/ProfileSecurityPage'
import CategoryTreePage from '@/features/catalog/pages/CategoryTreePage'
import CopyDetailPage from '@/features/catalog/pages/CopyDetailPage'
import EditionDetailPage from '@/features/catalog/pages/EditionDetailPage'
import InventoryCheckPage from '@/features/catalog/pages/InventoryCheckPage'
import SeriesListPage from '@/features/catalog/pages/SeriesListPage'
import StockAlertsPage from '@/features/catalog/pages/StockAlertsPage'
import StockOutPage from '@/features/catalog/pages/StockOutPage'
import StockReceiptsPage from '@/features/catalog/pages/StockReceiptsPage'
import SuppliersPage from '@/features/catalog/pages/SuppliersPage'
import TitleDetailPage from '@/features/catalog/pages/TitleDetailPage'
import TitleListPage from '@/features/catalog/pages/TitleListPage'
import CustomerDetailPage from '@/features/customers/pages/CustomerDetailPage'
import CustomerListPage from '@/features/customers/pages/CustomerListPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import PosPage from '@/features/pos/pages/PosPage'
import PosShiftPage from '@/features/pos/pages/PosShiftPage'
import PosCustomerDisplayPage from '@/features/pos/pages/PosCustomerDisplayPage'
import HumanResourcesPage from '@/features/hr/pages/HumanResourcesPage'
import EmployeeListPage from '@/features/hr/pages/EmployeeListPage'
import EmployeeDetailPage from '@/features/hr/pages/EmployeeDetailPage'
import HrRequestsPage from '@/features/hr/pages/HrRequestsPage'
import PayrollAdjustmentPage from '@/features/hr/pages/PayrollAdjustmentPage'
import PayrollPage from '@/features/hr/pages/PayrollPage'
import PayslipPage from '@/features/hr/pages/PayslipPage'
import ShiftRecordsPage from '@/features/hr/pages/ShiftRecordsPage'
import AttendancePage from '@/features/hr/pages/AttendancePage'
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
import { useAuth } from '@/features/auth/auth.hook'
import { RoleGuard } from './RoleGuard'
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
      <Route path="/change-password" element={<RequireSession><RoleGuard screenId="changePassword"><FirstChangePasswordPage /></RoleGuard></RequireSession>} />
      <Route path="/first-change-password" element={<RequireSession><RoleGuard screenId="changePassword"><FirstChangePasswordPage /></RoleGuard></RequireSession>} />
      <Route path="/profile" element={<RequireSession><RoleGuard screenId="profile"><ProfileSecurityPage /></RoleGuard></RequireSession>} />
      <Route path="/dashboard" element={<RequireSession><RoleGuard screenId="dashboard"><DashboardRoute /></RoleGuard></RequireSession>} />
      <Route path="/pos" element={<RequireSession><RoleGuard screenId="pos"><PosPage /></RoleGuard></RequireSession>} />
      <Route path="/pos/customer-display" element={<RequireSession><RoleGuard screenId="posCustomerDisplay"><PosCustomerDisplayPage /></RoleGuard></RequireSession>} />
      <Route path="/pos/shift" element={<RequireSession><RoleGuard screenId="posShift"><PosShiftPage /></RoleGuard></RequireSession>} />
      <Route path="/customers" element={<RequireSession><RoleGuard screenId="customers"><CustomerListPage /></RoleGuard></RequireSession>} />
      <Route path="/customers/:id" element={<RequireSession><RoleGuard screenId="customerDetail"><CustomerDetailPage /></RoleGuard></RequireSession>} />
      <Route path="/hr" element={<RequireSession><RoleGuard screenId="hr"><HumanResourcesPage /></RoleGuard></RequireSession>} />
      <Route path="/hr/employees" element={<RequireSession><RoleGuard screenId="hrEmployees"><EmployeeListPage /></RoleGuard></RequireSession>} />
      <Route path="/hr/employees/:id" element={<RequireSession><RoleGuard screenId="hrEmployeeDetail"><EmployeeDetailPage /></RoleGuard></RequireSession>} />
      <Route path="/hr/shifts" element={<RequireSession><RoleGuard screenId="hrShifts"><ShiftRecordsPage /></RoleGuard></RequireSession>} />
      <Route path="/hr/attendance" element={<RequireSession><RoleGuard screenId="hrAttendance"><AttendancePage /></RoleGuard></RequireSession>} />
      <Route path="/hr/attendance/personal" element={<RequireSession><RoleGuard screenId="hrPersonalAttendance"><AttendancePage /></RoleGuard></RequireSession>} />
      <Route path="/hr/requests" element={<RequireSession><RoleGuard screenId="hrRequests"><HrRequestsPage /></RoleGuard></RequireSession>} />
      <Route path="/hr/payroll" element={<RequireSession><RoleGuard screenId="hrPayroll"><PayrollPage /></RoleGuard></RequireSession>} />
      <Route path="/hr/payroll/adjustments/new" element={<RequireSession><RoleGuard screenId="hrPayrollAdjustment"><PayrollAdjustmentPage /></RoleGuard></RequireSession>} />
      <Route path="/hr/payslip" element={<RequireSession><RoleGuard screenId="hrPayslip"><PayslipPage /></RoleGuard></RequireSession>} />
      <Route path="/hr/payslip/:employeeId" element={<RequireSession><RoleGuard screenId="hrEmployeePayslip"><PayslipPage /></RoleGuard></RequireSession>} />
      <Route path="/approvals" element={<RequireSession><RoleGuard screenId="approvals"><ApprovalsPage /></RoleGuard></RequireSession>} />
      <Route
        path={auditPaths.root}
        element={
          <RequireSession><RoleGuard screenId="audit"><AuditPage /></RoleGuard></RequireSession>
        }
      />
      <Route
        path={auditPaths.copyLifecycle}
        element={
          <RequireSession><RoleGuard screenId="auditCopyLifecycle"><CopyLifecycleLookupPage /></RoleGuard></RequireSession>
        }
      />
      <Route
        path={reportsPaths.root}
        element={
          <RequireSession><RoleGuard screenId="reports"><ReportsPage /></RoleGuard></RequireSession>
        }
      />
      <Route
        path={reportsPaths.revenueExpense}
        element={
          <RequireSession><RoleGuard screenId="reportsRevenueExpense"><RevenueExpenseReportPage /></RoleGuard></RequireSession>
        }
      />
      <Route
        path={reportsPaths.depositReconciliation}
        element={
          <RequireSession><RoleGuard screenId="reportsDepositReconciliation"><DepositReconciliationPage /></RoleGuard></RequireSession>
        }
      />
      <Route
        path={reportsPaths.taxDeclaration}
        element={
          <RequireSession><RoleGuard screenId="reportsTaxDeclaration"><TaxDeclarationReportPage /></RoleGuard></RequireSession>
        }
      />
      <Route path="/settings" element={<RequireSession><RoleGuard screenId="settings"><SettingsPage /></RoleGuard></RequireSession>} />
      <Route path="/settings/rental" element={<RequireSession><RoleGuard screenId="settingsRental"><SettingsPage /></RoleGuard></RequireSession>} />
      <Route path="/settings/tiers" element={<RequireSession><RoleGuard screenId="settingsTiers"><SettingsPage /></RoleGuard></RequireSession>} />
      <Route path="/settings/rbac" element={<RequireSession><RoleGuard screenId="settingsRbac"><SettingsPage /></RoleGuard></RequireSession>} />
      <Route path="/settings/integrations" element={<RequireSession><RoleGuard screenId="settingsIntegrations"><SettingsPage /></RoleGuard></RequireSession>} />
      <Route path="/catalog/categories" element={<RequireSession><RoleGuard screenId="catalogCategories"><CategoryTreePage /></RoleGuard></RequireSession>} />
      <Route path="/catalog/series" element={<RequireSession><RoleGuard screenId="catalogSeries"><SeriesListPage /></RoleGuard></RequireSession>} />
      <Route path="/catalog/titles" element={<RequireSession><RoleGuard screenId="catalogTitles"><TitleListPage /></RoleGuard></RequireSession>} />
      <Route path="/catalog/titles/:titleId" element={<RequireSession><RoleGuard screenId="catalogTitleDetail"><TitleDetailPage /></RoleGuard></RequireSession>} />
      <Route path="/catalog/editions/:editionId" element={<RequireSession><RoleGuard screenId="catalogEditionDetail"><EditionDetailPage /></RoleGuard></RequireSession>} />
      <Route path="/catalog/copies/:copyId" element={<RequireSession><RoleGuard screenId="catalogCopyDetail"><CopyDetailPage /></RoleGuard></RequireSession>} />
      <Route path="/suppliers" element={<RequireSession><RoleGuard screenId="suppliers"><SuppliersPage /></RoleGuard></RequireSession>} />
      <Route path="/stock-receipts" element={<RequireSession><RoleGuard screenId="stockReceipts"><StockReceiptsPage /></RoleGuard></RequireSession>} />
      <Route path="/stock-out" element={<RequireSession><RoleGuard screenId="stockOut"><StockOutPage /></RoleGuard></RequireSession>} />
      <Route path="/inventory-check" element={<RequireSession><RoleGuard screenId="inventoryCheck"><InventoryCheckPage /></RoleGuard></RequireSession>} />
      <Route path="/stock-alerts" element={<RequireSession><RoleGuard screenId="stockAlerts"><StockAlertsPage /></RoleGuard></RequireSession>} />
      <Route path="/catalog/suppliers" element={<RequireSession><RoleGuard screenId="suppliers"><Navigate replace to="/suppliers" /></RoleGuard></RequireSession>} />
      <Route path="/catalog/stock-receipts" element={<RequireSession><RoleGuard screenId="stockReceipts"><Navigate replace to="/stock-receipts" /></RoleGuard></RequireSession>} />
      <Route path="/catalog/stock-out" element={<RequireSession><RoleGuard screenId="stockOut"><Navigate replace to="/stock-out" /></RoleGuard></RequireSession>} />
      <Route path="/catalog/inventory-check" element={<RequireSession><RoleGuard screenId="inventoryCheck"><Navigate replace to="/inventory-check" /></RoleGuard></RequireSession>} />
      <Route path="/catalog/stock-alerts" element={<RequireSession><RoleGuard screenId="stockAlerts"><Navigate replace to="/stock-alerts" /></RoleGuard></RequireSession>} />
      <Route path="*" element={<NotFound />} />  
    </Routes>
  )
}
