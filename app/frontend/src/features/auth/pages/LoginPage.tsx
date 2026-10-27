import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSafeNextPath } from '@/features/auth/session'
import { Banner } from '@/features/auth/components/Banner'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { SplitLayout } from '@/features/auth/components/SplitLayout'
import { TextField } from '@/components/common/TextField'
import { describeLoginError } from '@/features/auth/errors'
import type { Notice } from '@/features/auth/errors'
import { useAuth } from '@/features/auth/auth.hook'

export function LoginPage({ search }: { search: string }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const params = new URLSearchParams(search)
  const justActivated = params.get('activated') === '1'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    setNotice(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate(getSafeNextPath(params.get('next')), { replace: true })
    } catch (error) {
      setNotice(describeLoginError(error))
      setPassword('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SplitLayout>
      <section aria-labelledby="login-title" className="cb-card">
        <span className="cb-chip">Chào mừng trở lại</span>
        <h1 className="cb-title" id="login-title">Đăng nhập hệ thống</h1>
        <p className="cb-subtitle">Sẵn sàng cho một ca làm việc thật tốt. Đăng nhập bằng tài khoản được cửa hàng cấp.</p>

        <form className="cb-form" onSubmit={submit}>
          {justActivated && !notice && <Banner tone="success">Tài khoản đã được kích hoạt. Hãy đăng nhập để bắt đầu.</Banner>}
          <TextField
            autoComplete="username"
            label="Email nội bộ"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <PasswordField
            autoComplete="current-password"
            label="Mật khẩu"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            value={password}
            warnCapsLock
          />
          <div className="cb-form__row">
            <button className="cb-link" onClick={() => navigate('/forgot-password')} type="button">Quên mật khẩu?</button>
          </div>
          <button className="cb-btn cb-btn--primary cb-btn--block" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Đang đăng nhập…' : <>Đăng nhập <span className="cb-btn__hint">Enter ↵</span></>}
          </button>
          {notice && <Banner tone={notice.tone}>{notice.message}</Banner>}
        </form>

        <p className="cb-divider-text">Bạn là nhân viên mới?</p>
        <button className="cb-btn cb-btn--outline cb-btn--block" onClick={() => navigate('/activate')} type="button">
          Kích hoạt tài khoản nhân viên mới
        </button>
      </section>
    </SplitLayout>
  )
}

export default LoginPage
