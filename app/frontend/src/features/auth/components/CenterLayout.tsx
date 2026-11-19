import type { ReactNode } from 'react'
import { Logo } from '@/components/common/Logo'

export function CenterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full flex-col bg-slate-50 text-left font-sans text-sm leading-6 text-slate-700">
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-10 sm:py-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">{children}</main>
      <footer className="px-5 pb-6 pt-4 text-center text-xs leading-5 text-slate-400">
        Nhà sách Mây · Bảo mật nội bộ · v1.0.0-MVP
      </footer>
    </div>
  )
}
