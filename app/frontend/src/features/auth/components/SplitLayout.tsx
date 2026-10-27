import type { ReactNode } from 'react'
import { brand } from '@/tmp/config/brand'
import { useServerStatus } from '@/features/auth/auth.hook'
import { Brand } from './Brand'
import { HeroArt } from './HeroArt'
import { ServerStatusBadge } from './ServerStatusBadge'

export function SplitLayout({ children }: { children: ReactNode }) {
  const status = useServerStatus()
  return (
    <div className="cb-auth cb-split">
      <aside className="cb-split__aside">
        <Brand />
        <div className="cb-split__copy">
          <p className="cb-eyebrow">{brand.store} · {brand.tagline}</p>
          <p className="cb-hero-title">Sách cũ.<br />Những câu chuyện mới.</p>
          <p className="cb-hero-text">
            Một không gian kết nối những người yêu sách.<br />
            Một hệ thống để bạn chăm chút từng cuốn truyện.
          </p>
        </div>
        <HeroArt />
        <p className="cb-aside-tags">Quản lý gọn gàng • Giao dịch an tâm • Giữ trọn niềm yêu sách</p>
        <p className="cb-aside-foot">© {new Date().getFullYear()} {brand.name} · Dành cho nhân sự nội bộ {brand.store}</p>
      </aside>
      <main className="cb-split__main">
        <div className="cb-topbar">
          <ServerStatusBadge status={status} />
          <span className="cb-version">{brand.version}</span>
        </div>
        <div className="cb-split__center">
          <div className="cb-mobile-brand"><Brand compact /></div>
          {children}
        </div>
        <p className="cb-foot">
          Bảo mật nội bộ · Không chia sẻ tài khoản hoặc liên kết kích hoạt.<br />
          Cần hỗ trợ? Liên hệ Quản trị viên cửa hàng.
        </p>
      </main>
    </div>
  )
}
