import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import LoginPage from '@/features/auth/pages/LoginPage'
import ActivateAccountPage from '@/features/auth/pages/ActivateAccountPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import { useAuth } from '@/features/auth/auth.hook'
import { isAccessTokenUsable } from '@/features/auth/session'

function LoginRoute() {
  const { search } = useLocation()
  return <LoginPage search={search} />
}

function ActivateAccountRoute() {
  const { search } = useLocation()
  return <ActivateAccountPage search={search} />
}

function DashboardRoute() {
  const { pathname, search } = useLocation()
  const { session, signOut } = useAuth()

  if (!isAccessTokenUsable(session?.accessToken)) {
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
      <Route path="/activate" element={<ActivateAccountRoute />} />
      <Route path="/verify-email" element={<ActivateAccountRoute />} />
      <Route path="/dashboard" element={<DashboardRoute />} />
      <Route path="*" element={<Navigate replace to="/login" />} />
    </Routes>
  )
}
