import type { ReactNode } from 'react'
import { brand } from '@/lib/brand'
import { useServerStatus } from '@/features/auth/auth.hook'
import { Brand } from './Brand'
import { HeroArt } from './HeroArt'
import { ServerStatusBadge } from './ServerStatusBadge'

export function SplitLayout({ children }: { children: ReactNode }) {
  const status = useServerStatus()
  return (
    <div className="min-h-svh w-full bg-slate-50 text-left font-sans text-sm leading-6 text-slate-700 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="hidden min-h-svh flex-col gap-7 bg-[#f7e8cd] px-14 py-12 text-indigo-950 lg:flex">
        <Brand />
        <div className="mt-6">
          <p className="mt-5 text-[clamp(2rem,3.4vw,2.875rem)] font-black leading-[1.3] tracking-tight text-indigo-950">{brand.productName}</p>
          <p className="mt-5 text-[15px] leading-6 text-indigo-950">
            Hệ thống quản lý dành cho nhân viên nhà sách
          </p>
        </div>
        <HeroArt />
        <p className="mt-auto text-xs text-slate-500">© {new Date().getFullYear()} {brand.name}</p>
      </aside>
      <main className="flex min-h-svh flex-col px-4 py-5 sm:px-10 sm:py-7">
        <div className="flex items-center justify-between gap-3">
          <ServerStatusBadge status={status} />
          <span className="text-xs text-slate-500">{brand.version}</span>
        </div>
        <div className="flex flex-1 flex-col justify-center py-6">
          <div className="mb-5 lg:hidden"><Brand compact /></div>
          {children}
        </div>
      </main>
    </div>
  )
}
