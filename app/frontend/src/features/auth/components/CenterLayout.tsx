import type { ReactNode } from 'react'
import { brand } from '@/lib/brand'
import { useServerStatus } from '@/features/auth/auth.hook'
import { Brand } from './Brand'
import { ServerStatusBadge } from './ServerStatusBadge'

export function CenterLayout({ children }: { children: ReactNode }) {
    const status = useServerStatus()
    return (
        <div className="flex min-h-svh w-full flex-col bg-slate-50 text-left font-sans text-sm leading-6 text-slate-700">
            <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-10 sm:py-6">
                <Brand compact />
                <ServerStatusBadge status={status} />
            </header>
            <main className="flex flex-1 items-start justify-center px-4 pb-10 pt-6 sm:px-5">{children}</main>
            <footer className="px-5 pb-6 pt-4 text-center text-xs leading-5 text-slate-500">{brand.store} · Bảo mật nội bộ · {brand.version}</footer>
        </div>
    )
}
