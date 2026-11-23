import type { ReactNode } from 'react'
import { brand } from '@/lib/brand'
import { Logo } from '@/components/common/Logo'

export function SplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh w-full bg-slate-50 text-left font-sans text-sm leading-6 text-slate-700 lg:grid lg:grid-cols-2">
      <aside className="hidden min-h-svh flex-col justify-between bg-[linear-gradient(rgba(15,23,42,0.52),rgba(15,23,42,0.6)),url('https://images.unsplash.com/photo-1676605671155-dd5259839602?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D')] bg-cover bg-center bg-no-repeat px-12 py-10 text-white lg:flex">
        <Logo inverted size="lg" />
        <div className="my-auto max-w-md py-8">
          <p className="text-[clamp(2.25rem,3.6vw,3rem)] font-black leading-[1.18] tracking-tight text-white">
            {brand.productName}
          </p>
          <p className="mt-4 text-lg leading-7 text-white/90">
            Hệ thống quản lý dành cho nhân viên nhà sách
          </p>
        </div>
        <p className="text-xs text-white/75">© 2026 {brand.name}</p>
      </aside>
      <main className="flex min-h-svh flex-col bg-slate-50 px-4 py-6 sm:px-10 sm:py-8">
        <div className="mb-6 lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-4">
          {children}
        </div>
      </main>
    </div>
  )
}
