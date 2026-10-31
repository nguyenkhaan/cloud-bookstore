import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import LoginPage from '@/features/auth/pages/LoginPage'
import VerifyRegisterPage from '@/features/auth/pages/VerifyRegisterPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import { useAuth } from '@/features/auth/auth.hook'

function LoginRoute() {
  const { search } = useLocation()
  return <LoginPage search={search} />
}

function VerifyRegisterRoute() {
  const { search } = useLocation()
  return <VerifyRegisterPage search={search} />
}

function DashboardRoute() {
  const { pathname, search } = useLocation()
  const { session, isInitializing, signOut } = useAuth()

  if (isInitializing) return null

  if (!session) {
    const next = encodeURIComponent(`${pathname}${search}`)
    return <Navigate replace to={`/login?next=${next}`} />
  }

  return <DashboardPage onSignOut={signOut} />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate replace to="/login" />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/verify-register" element={<VerifyRegisterRoute />} />
      <Route path="/dashboard" element={<DashboardRoute />} />
      <Route path="*" element={<Navigate replace to="/login" />} />
    </Routes>
  )
}
