import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, TextField } from '@/components/common'
import { getSafeNextPath } from '@/features/auth/session'
import { Banner } from '@/features/auth/components/Banner'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { SplitLayout } from '@/features/auth/components/SplitLayout'
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
      <Card aria-labelledby="login-title" className="mx-auto w-full max-w-[500px] rounded-3xl border-slate-200/70 p-5 shadow-[0_8px_28px_rgba(30,27,75,0.06)] sm:p-9" padding="none" role="region">
        <Badge size="md" variant="brand">Chào mừng trở lại</Badge>
        <h1 className="mt-4.5 text-[28px] font-bold leading-tight text-indigo-950" id="login-title">Đăng nhập hệ thống</h1>
        <p className="mt-2.5 text-sm text-slate-500">Sẵn sàng cho một ca làm việc thật tốt. Đăng nhập bằng tài khoản được cửa hàng cấp.</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
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
          <div className="-mt-1 flex justify-end">
            <Button className="min-h-11 px-1 text-[13px] text-indigo-600 hover:bg-transparent hover:text-indigo-700 hover:underline" onClick={() => navigate('/forgot-password')} size="sm" type="button" variant="ghost">Quên mật khẩu?</Button>
          </div>
          <Button className="min-h-11" fullWidth loading={isSubmitting} size="lg" type="submit" variant="primary">
            {isSubmitting ? 'Đang đăng nhập…' : <>Đăng nhập <span className="text-xs font-medium opacity-85">Enter ↵</span></>}
          </Button>
          {notice && <Banner tone={notice.tone}>{notice.message}</Banner>}
        </form>

        <p className="mb-3 mt-6 text-center text-[13px] text-slate-500">Bạn là nhân viên mới?</p>
        <Button className="min-h-11" fullWidth onClick={() => navigate('/activate')} size="lg" type="button" variant="outline">
          Kích hoạt tài khoản nhân viên mới
        </Button>
      </Card>
    </SplitLayout>
  )
}

export default LoginPage
