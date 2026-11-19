import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, TextField } from '@/components/common'
import { Banner } from '@/features/auth/components/Banner'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { SplitLayout } from '@/features/auth/components/SplitLayout'
import { useAuth } from '@/features/auth/auth.hook'
import { ApiError } from '@/features/auth/auth.service'
import type { Notice } from '@/features/auth/auth.type'

const unexpected: Notice = { tone: 'error', message: 'Có lỗi không mong muốn. Hãy thử lại sau.' }

// eslint-disable-next-line react/only-export-components -- unit-tested login page helper
export function getSafeNextPath(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

// eslint-disable-next-line react/only-export-components -- unit-tested login page helper
export function describeLoginError(error: unknown): Notice {
  if (!(error instanceof ApiError)) return unexpected

  switch (error.status) {
    case 0:
      return { tone: 'error', message: 'Không thể kết nối tới máy chủ. Hãy kiểm tra mạng và thử lại.' }
    case 401:
      return { tone: 'warning', message: 'Email hoặc mật khẩu không đúng. Tài khoản sẽ bị tạm khóa nếu nhập sai quá nhiều lần.' }
    case 403:
      if (/locked/i.test(error.message)) {
        return { tone: 'error', message: 'Tài khoản đang bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ít phút.' }
      }
      return { tone: 'warning', message: 'Tài khoản chưa được kích hoạt hoặc không khả dụng. Hãy kích hoạt tài khoản hoặc liên hệ Quản trị viên.' }
    default:
      return { tone: 'error', message: 'Không thể đăng nhập lúc này. Hãy thử lại sau.' }
  }
}

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
      <div className="mx-auto w-full max-w-[500px]">
        <Card
          aria-labelledby="login-title"
          className="w-full rounded-3xl border-slate-200/70 p-6 shadow-[0_10px_32px_rgba(30,27,75,0.06)] sm:p-10"
          padding="none"
          role="region"
        >
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]" id="login-title">
            Đăng nhập hệ thống
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sẵn sàng cho một ca làm việc thật tốt. Đăng nhập bằng tài khoản được cửa hàng cấp.
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
            {justActivated && !notice && (
              <Banner tone="success">Tài khoản đã được kích hoạt. Hãy đăng nhập để bắt đầu.</Banner>
            )}

            <TextField
              autoComplete="username"
              label="Email nội bộ"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nv.phong@nhasachmay.vn"
              required
              type="email"
              value={email}
              variant="outlined"
            />

            <PasswordField
              autoComplete="current-password"
              label="Mật khẩu"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              required
              value={password}
              variant="outlined"
              warnCapsLock
            />

            <div className="-mt-1 flex justify-end">
              <Link
                className="inline-flex min-h-11 items-center rounded-lg px-1 text-[13px] font-medium text-indigo-600 transition-colors hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                data-testid="auth-forgot-link"
                to="/forgot-password"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <Button
              className="min-h-12 text-[15px]"
              data-testid="auth-login-submit"
              fullWidth
              loading={isSubmitting}
              size="lg"
              type="submit"
              variant="primary"
            >
              {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>

            {notice && <Banner tone={notice.tone}>{notice.message}</Banner>}
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Chưa có tài khoản?{' '}
            <Link
              className="inline-flex min-h-11 items-center font-semibold text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              data-testid="auth-register-link"
              to="/register"
            >
              Đăng ký nhân viên
            </Link>
          </p>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Cần hỗ trợ? Liên hệ Quản trị viên cửa hàng.
        </p>
      </div>
    </SplitLayout>
  )
}

export default LoginPage
