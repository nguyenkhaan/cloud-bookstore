import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import LoginPage from '@/features/auth/pages/LoginPage'
import VerifyRegisterPage from '@/features/auth/pages/VerifyRegisterPage'
import CopyDetailPage from '@/features/catalog/pages/CopyDetailPage'
import EditionDetailPage from '@/features/catalog/pages/EditionDetailPage'
import SeriesListPage from '@/features/catalog/pages/SeriesListPage'
import TitleDetailPage from '@/features/catalog/pages/TitleDetailPage'
import TitleListPage from '@/features/catalog/pages/TitleListPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import BookSeriesPage from '@/features/bookseries/pages/BookSeriesPage'
import { useAuth } from '@/features/auth/auth.hook'

function LoginRoute() {
  const { search } = useLocation()
  return <LoginPage search={search} />
}

function VerifyRegisterRoute() {
  const { search } = useLocation()
  return <VerifyRegisterPage search={search} />
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
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/verify-register" element={<VerifyRegisterRoute />} />
      <Route path="/dashboard" element={<RequireSession><DashboardRoute /></RequireSession>} />
      <Route path="/book-series" element={<RequireSession><BookSeriesPage /></RequireSession>} />
      <Route path="/catalog/series" element={<RequireSession><SeriesListPage /></RequireSession>} />
      <Route path="/catalog/titles" element={<RequireSession><TitleListPage /></RequireSession>} />
      <Route path="/catalog/titles/:titleId" element={<RequireSession><TitleDetailPage /></RequireSession>} />
      <Route path="/catalog/editions/:editionId" element={<RequireSession><EditionDetailPage /></RequireSession>} />
      <Route path="/catalog/copies/:copyId" element={<RequireSession><CopyDetailPage /></RequireSession>} />
      <Route path="*" element={<Navigate replace to="/login" />} />
    </Routes>
  )
}
