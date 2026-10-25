import type { ReactNode } from 'react'

// Gáy sách trên kệ: chiều cao, độ rộng và màu khác nhau; đây là điểm nhấn duy nhất của màn hình đăng nhập.
const SPINES = [
    'h-48 w-7 bg-teal-700', 'h-60 w-5 bg-amber-600', 'h-44 w-9 bg-slate-200', 'h-56 w-6 bg-rose-800',
    'h-64 w-8 bg-teal-900', 'h-48 w-5 bg-amber-300', 'h-60 w-7 bg-slate-500', 'h-52 w-9 bg-rose-700',
    'h-44 w-6 bg-teal-500', 'h-56 w-5 bg-slate-100', 'h-64 w-8 bg-amber-700', 'h-48 w-7 bg-teal-800',
]

interface AuthLayoutProps {
    title: string
    description?: string
    children: ReactNode
    footer?: ReactNode
}

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
    return (
        <div className="grid min-h-screen bg-slate-100 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <aside className="hidden flex-col justify-between bg-slate-900 p-12 text-slate-100 lg:flex" aria-hidden="true">
                <p className="font-serif text-2xl">Cloud Bookstore</p>
                <div>
                    <div className="flex items-end gap-1 border-b-8 border-amber-900 pb-0">
                        {SPINES.map((spine, index) => (
                            <div key={index} className={`rounded-t-sm ${spine}`} />
                        ))}
                    </div>
                    <p className="mt-8 max-w-xs font-serif text-lg leading-relaxed text-slate-300">
                        Bán, cho thuê và kiểm kho sách cũ tại một nơi.
                    </p>
                </div>
            </aside>

            <main className="flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    <p className="mb-8 font-serif text-xl text-slate-900 lg:hidden">Cloud Bookstore</p>
                    <h1 className="font-serif text-3xl text-slate-900">{title}</h1>
                    {description && <p className="mt-2 text-slate-600">{description}</p>}
                    <div className="mt-8">{children}</div>
                    {footer && <div className="mt-6 text-sm text-slate-700">{footer}</div>}
                </div>
            </main>
        </div>
    )
}