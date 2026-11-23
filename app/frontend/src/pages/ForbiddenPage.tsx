import { Link, useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import { getFirstAllowedWorkspacePath } from '@/routes/screen-access.policy'
import type { AppRole } from '@/features/auth/role'

export type ForbiddenPageProps = {
  currentPath?: string
}

export function ForbiddenPage({ currentPath = 'overview' }: ForbiddenPageProps) {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const role = session?.user?.roleCode as AppRole | undefined
  const workspacePath = role ? getFirstAllowedWorkspacePath(role) : '/login'
  const user = session?.user

  return (
    <MainLayout
      currentPath={currentPath}
      onNavigate={() => navigate(workspacePath)}
      onSignOut={signOut}
      user={{
        name: user?.name ?? 'Người dùng',
        role: user?.role ?? 'Người dùng',
        roleCode: role,
        avatarUrl: user?.avatarUrl,
      }}
      pageTitle="Không có quyền truy cập"
      breadcrumbs={[
        { label: 'Không gian làm việc', to: workspacePath },
        { label: 'Hạn chế quyền (403)' },
      ]}
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
          Quyền truy cập của tài khoản hiện tại không bao gồm chức năng này.
          Vui lòng liên hệ Quản trị viên nếu bạn cần cấp quyền.
        </p>
        <Link
          to={workspacePath}
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          Quay về Tổng quan
        </Link>
      </div>
    </MainLayout>
  )
}

