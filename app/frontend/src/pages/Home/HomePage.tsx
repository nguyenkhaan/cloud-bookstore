import { AccessCheckPanel } from '../../features/auth/components/AccessCheckPanel'
import { LogoutButton } from '../../features/auth/components/LogoutButton'
import { useAuth } from '../../features/auth/hooks/useAuth'

const ROLE_LABEL = {
    ADMIN: 'Admin',
    CASHIER: 'Nhân viên',
    INVENTORY_MANAGER: 'Quản lý kho',
} as const

export default function HomePage() {
    const { user } = useAuth()
    if (!user) return null

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <p className="font-serif text-xl text-slate-900">Cloud Bookstore</p>
                <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                        <p className="font-medium text-slate-900">{user.fullName}</p>
                        <p className="text-slate-600">{ROLE_LABEL[user.role]}</p>
                    </div>
                    <LogoutButton />
                </div>
            </header>
            <main className="mx-auto max-w-4xl px-6 py-10">
                <h1 className="font-serif text-3xl text-slate-900">Xin chào, {user.fullName}</h1>
                <p className="mt-2 text-slate-600">Các chức năng vận hành sẽ xuất hiện ở đây theo vai trò của bạn.</p>
                <AccessCheckPanel />
            </main>
        </div>
    )
}