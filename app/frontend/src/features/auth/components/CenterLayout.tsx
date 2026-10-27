import type { ReactNode } from 'react'
import { brand } from '@/tmp/config/brand'
import { useServerStatus } from '@/features/auth/auth.hook'
import { Brand } from './Brand'
import { ServerStatusBadge } from './ServerStatusBadge'

export function CenterLayout({ children }: { children: ReactNode }) {
    const status = useServerStatus()
    return (
        <div className="cb-auth cb-center">
            <header className="cb-topbar cb-topbar--center">
                <Brand compact />
                <ServerStatusBadge status={status} />
            </header>
            <main className="cb-center__body">{children}</main>
            <footer className="cb-foot">{brand.store} · Bảo mật nội bộ · {brand.version}</footer>
        </div>
    )
}
