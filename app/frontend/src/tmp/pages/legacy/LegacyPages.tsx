
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useAuth } from '@/features/auth/auth.hook'
import { navigate } from '@/tmp/routes/router'
import { apiUrl } from '@/tmp/services/apiClient'

export function Header() {
  const { session, signOut } = useAuth()
  return <header className="site-header">
    <button className="brand" onClick={() => navigate('/')}>Cloud Bookstore</button>
    <nav aria-label="Điều hướng chính">
      <button onClick={() => navigate('/catalog')}>Danh mục</button>
      <button onClick={() => navigate('/dashboard')}>Khu vực nhân viên</button>
      {session && <button onClick={signOut}>Đăng xuất</button>}
    </nav>
  </header>
}

export function Home() {
  return <Page><section className="hero">
    <p className="eyebrow">Đọc, khám phá, quay lại</p>
    <h1>Một hiệu sách công khai cho độc giả — và không gian riêng cho đội ngũ.</h1>
    <p>Danh mục luôn mở. Những thao tác quản trị, tạo phiếu và thanh toán chỉ xuất hiện sau khi nhân viên đăng nhập.</p>
    <div className="actions"><button className="primary" onClick={() => navigate('/catalog')}>Xem danh mục</button><button className="secondary" onClick={() => navigate('/dashboard')}>Đăng nhập nhân viên</button></div>
  </section></Page>
}

export function Catalog() {
  return <Page>
    <section className="page-heading"><p className="eyebrow">Danh mục công khai</p><h1>Những cuốn sách đang chờ được mở ra.</h1><p>Bạn có thể xem tự do. Thanh toán sẽ yêu cầu đăng nhập và tự giữ lại trang đích để quay về.</p></section>
    <article className="book-card"><span className="book-spine" aria-hidden="true">CB</span><div><p className="book-meta">Tuyển chọn cuối tuần</p><h2>Những ngày ở hiệu sách</h2><p>Một tựa sách mẫu cho catalog công khai.</p></div><button className="primary" onClick={() => navigate('/checkout')}>Tiến hành thanh toán</button></article>
  </Page>
}

export function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  return <Page>
    <section className="page-heading split-heading"><div><p className="eyebrow">Khu vực nhân viên</p><h1>Dashboard vận hành</h1><p>Phiên chỉ tồn tại trong bộ nhớ trình duyệt; khi access token hết hạn, bạn sẽ được đưa về đăng nhập.</p></div><button className="secondary" onClick={onSignOut}>Đăng xuất</button></section>
    <div className="dashboard-grid">
      <button className="action-tile" onClick={() => navigate('/inventory/new')}><span>01</span><strong>Tạo phiếu nhập kho</strong><small>Yêu cầu phiên hợp lệ</small></button>
      <button className="action-tile" onClick={() => navigate('/inventory/sample/edit')}><span>02</span><strong>Sửa dữ liệu kho</strong><small>Yêu cầu phiên hợp lệ</small></button>
      <button className="action-tile" onClick={() => navigate('/checkout')}><span>03</span><strong>Thanh toán</strong><small>Yêu cầu phiên hợp lệ</small></button>
    </div>
  </Page>
}

export function Checkout() {
  return <Page><section className="page-heading"><p className="eyebrow">Thanh toán</p><h1>Phiên của bạn còn hợp lệ.</h1><p>Đây là route được guard. Token hết hạn sẽ không cho tiếp tục thao tác.</p></section></Page>
}

export function InventoryEditor() {
  return <Page><section className="page-heading"><p className="eyebrow">Quản lý kho</p><h1>Biểu mẫu thao tác nội bộ</h1><p>Route tạo và sửa được bảo vệ cùng một quy tắc với dashboard và thanh toán.</p></section></Page>
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await fetch(apiUrl('/api/auth/password-reset-requests'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => undefined)
    setSubmitted(true)
  }
  return <main className="auth-shell"><form className="auth-card" onSubmit={submit}>
    <p className="eyebrow">Khôi phục mật khẩu</p><h1>Nhận liên kết đặt lại.</h1><p>Vì bảo mật, thông báo luôn giống nhau dù email có tồn tại hay không.</p>
    <label>Email<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
    {submitted && <p className="success" role="status">Nếu tài khoản đang hoạt động, bạn sẽ nhận được email đặt lại mật khẩu.</p>}
    <button className="primary" type="submit">Gửi liên kết</button><button className="link-button" onClick={() => navigate('/login')} type="button">Quay lại đăng nhập</button>
  </form></main>
}

export function ResetPasswordPage({ search }: { search: string }) {
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const token = new URLSearchParams(search).get('token')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) { setMessage('Liên kết đặt lại không hợp lệ.'); return }
    const response = await fetch(apiUrl('/api/auth/password-resets'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword }) }).catch(() => null)
    setMessage(response?.ok ? 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.' : 'Liên kết không hợp lệ hoặc đã hết hạn.')
  }
  return <main className="auth-shell"><form className="auth-card" onSubmit={submit}>
    <p className="eyebrow">Đặt lại mật khẩu</p><h1>Tạo mật khẩu mới.</h1><label>Mật khẩu mới<input minLength={12} onChange={(event) => setNewPassword(event.target.value)} required type="password" value={newPassword} /></label>
    {message && <p className="success" role="status">{message}</p>}<button className="primary" type="submit">Lưu mật khẩu mới</button>
  </form></main>
}

export function StatusPage({ message }: { message: string }) {
  return <main className="auth-shell"><section className="auth-card status-card"><p className="eyebrow">Cloud Bookstore</p><h1>Trạng thái phiên</h1><p role="status">{message}</p><button className="secondary" onClick={() => navigate('/login')}>Đến trang đăng nhập</button></section></main>
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="site-shell"><Header /><div className="page-content">{children}</div></main>
}
