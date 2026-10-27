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
          <p className="text-xs font-semibold tracking-wide text-orange-700">{brand.store} · {brand.tagline}</p>
          <p className="mt-5 text-[clamp(2rem,3.4vw,2.875rem)] font-bold leading-[1.22] tracking-tight text-indigo-950">Sách cũ.<br />Những câu chuyện mới.</p>
          <p className="mt-5 text-[15px] leading-6 text-indigo-950">
            Một không gian kết nối những người yêu sách.<br />
            Một hệ thống để bạn chăm chút từng cuốn truyện.
          </p>
        </div>
        <HeroArt />
        <p className="text-[13px] text-indigo-950">Quản lý gọn gàng • Giao dịch an tâm • Giữ trọn niềm yêu sách</p>
        <p className="mt-auto text-xs text-slate-500">© {new Date().getFullYear()} {brand.name} · Dành cho nhân sự nội bộ {brand.store}</p>
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
        <p className="px-5 pb-6 pt-4 text-center text-xs leading-5 text-slate-500">
          Bảo mật nội bộ · Không chia sẻ tài khoản hoặc liên kết kích hoạt.<br />
          Cần hỗ trợ? Liên hệ Quản trị viên cửa hàng.
        </p>
      </main>
    </div>
  )
}
