import type { ReactNode } from 'react'
import { brand } from '@/lib/brand'
import { Logo } from '@/components/common/Logo'

export function SplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh w-full bg-slate-50 text-left font-sans text-sm leading-6 text-slate-700 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Vạch chia nghiêng 4° (trên lệch phải, dưới lệch trái): aside lấn sang cột phải 3.5svh (= tan4° × ½ chiều cao) rồi bị clip-path cắt chéo,
          nên vạch đi qua ranh giới hai cột ở giữa chiều cao màn hình. */}
      <aside className="hidden min-h-svh flex-col gap-7 bg-[linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)),url('https://images.unsplash.com/photo-1676605671155-dd5259839602?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D')] bg-cover bg-center bg-no-repeat py-12 pl-14 pr-[calc(3.5svh+3.5rem)] text-indigo-950 lg:relative lg:z-10 lg:-mr-[3.5svh] lg:flex lg:[clip-path:polygon(0_0,100%_0,calc(100%-6.99svh)_100%,0_100%)]">
        <Logo size="lg" />
        <div className="mt-6">
          <p className="mt-5 text-[clamp(2rem,3.4vw,2.875rem)] font-black leading-[1.3] tracking-tight text-white">{brand.productName}</p>
          <p className="mt-5 text-lg leading-6 text-white">
            Hệ thống quản lý dành cho nhân viên nhà sách
          </p>
        </div>
        {/* <HeroArt /> */}
        <p className="mt-auto text-xs text-slate-500">© {new Date().getFullYear()} {brand.name}</p>
      </aside>
      <main className="flex min-h-svh flex-col px-4 py-5 sm:px-10 sm:py-7 lg:pl-[calc(3.5svh+1.5rem)]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{brand.version}</span>
        </div>
        <div className="flex flex-1 flex-col justify-center py-6">
          <div className="mb-5 lg:hidden"><Logo /></div>
          {children}
        </div>
      </main>
    </div>
  )
}
