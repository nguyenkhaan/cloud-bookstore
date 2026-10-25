import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import type { Role } from '../types/auth'

function Splash() {
    return (
        <div className="grid min-h-screen place-items-center text-sm text-slate-600" role="status">
            Đang khôi phục phiên đăng nhập…
        </div>
    )
}

/** Chặn người chưa đăng nhập; truyền `roles` để chặn thêm theo vai trò (BE vẫn là nơi quyết định cuối). */
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
    const { user, status } = useAuth()
    const location = useLocation()

    if (status === 'loading') return <Splash />
    if (!user) return <Navigate to="/login" replace state={{ from: location }} />
    if (roles && !roles.includes(user.role)) {
        return (
            <div className="grid min-h-screen place-items-center px-6 text-center">
                <p className="max-w-sm text-slate-700">Tài khoản của bạn không có quyền truy cập trang này.</p>
            </div>
        )
    }
    return <Outlet />
}

/** Trang đăng nhập/đăng ký: đã đăng nhập thì chuyển về trang đang định vào (hoặc trang chủ). */
export function PublicOnlyRoute() {
    const { user, status } = useAuth()
    const location = useLocation()

    if (status === 'loading') return <Splash />
    if (user) {
        const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
        return <Navigate to={from ?? '/'} replace />
    }
    return <Outlet />
}