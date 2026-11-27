import { useLayoutEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Info } from 'lucide-react'
import { Button, Card } from '@/components/common'
import { Banner } from '@/features/auth/components/Banner'
import { CenterLayout } from '@/features/auth/components/CenterLayout'
import { PasswordField } from '@/features/auth/components/PasswordField'
import {
  isPasswordAcceptable,
  PasswordRules,
} from '@/features/auth/components/PasswordRules'
import { PasswordStrengthBar } from '@/features/auth/components/PasswordStrengthBar'
import { useResetPasswordMutation } from '@/features/auth/auth.hook'
import { ApiError, localizeAuthError } from '@/features/auth/auth.service'
import type { Notice } from '@/features/auth/auth.type'

export function ResetPasswordPage({ search }: { search: string }) {
  const navigate = useNavigate()
  const [token] = useState(() => new URLSearchParams(search).get('token')?.trim() ?? '')
  const { isPending, mutateAsync: resetPassword } = useResetPasswordMutation()

  const [expired, setExpired] = useState(!token)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  useLayoutEffect(() => {
    if (new URLSearchParams(window.location.search).has('token')) {
      window.history.replaceState(null, '', '/reset-password')
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending || !token) return

    setNotice(null)
    let hasError = false
    if (!isPasswordAcceptable(newPassword)) {
      setPasswordError('Mật khẩu cần 12-128 ký tự, gồm chữ hoa, chữ số và ký tự đặc biệt.')
      hasError = true
    } else {
      setPasswordError(null)
    }

    if (confirmPassword !== newPassword) {
      setConfirmError('Mật khẩu xác nhận không khớp.')
      hasError = true
    } else {
      setConfirmError(null)
    }

    if (hasError) return

    try {
      await resetPassword({ token, newPassword })
      navigate('/login?reset=1', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setExpired(true)
        return
      }
      if (error instanceof ApiError && error.status === 0) {
        setNotice({
          tone: 'error',
          message: 'Không thể kết nối tới máy chủ. Hãy kiểm tra mạng và thử lại.',
        })
        return
      }
      setNotice({
        tone: 'error',
        message: localizeAuthError(error, 'Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại sau.'),
      })
    }
  }

  if (expired) {
    return (
      <CenterLayout>
        <Card
          aria-labelledby="reset-expired-title"
          className="mx-auto w-full max-w-[520px] rounded-3xl border-slate-200/70 p-6 text-center shadow-[0_10px_32px_rgba(30,27,75,0.06)] sm:p-10"
          padding="none"
          role="region"
        >
          <div className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600">
            <AlertCircle aria-hidden="true" className="size-8" />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900" id="reset-expired-title">
            Liên kết đã hết hạn hoặc không hợp lệ
          </h1>
          <p className="mt-2.5 text-sm leading-6 text-slate-500">
            Liên kết đặt lại mật khẩu chỉ có hiệu lực một lần và tự động hết hạn sau 15 phút vì lý do an toàn. Vui lòng gửi lại yêu cầu để nhận liên kết xác minh mới.
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <Button
              className="min-h-12 text-[15px]"
              data-testid="auth-expired-resend"
              fullWidth
              onClick={() => navigate('/forgot-password')}
              size="lg"
              type="button"
              variant="primary"
            >
              Gửi lại email khôi phục
            </Button>

            <Link
              className="mx-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              to="/login"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Quay lại trang đăng nhập
            </Link>
          </div>
        </Card>
      </CenterLayout>
    )
  }

  return (
    <CenterLayout>
      <Card
        aria-labelledby="reset-title"
        className="mx-auto w-full max-w-[520px] rounded-3xl border-slate-200/70 p-6 shadow-[0_10px_32px_rgba(30,27,75,0.06)] sm:p-10"
        padding="none"
        role="region"
      >
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]" id="reset-title">
          Đặt lại mật khẩu mới
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
        </p>

        <form className="mt-6 flex flex-col gap-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2.5">
            <PasswordField
              autoComplete="new-password"
              hint={passwordError}
              invalid={Boolean(passwordError)}
              label="Mật khẩu mới"
              name="newPassword"
              onChange={(event) => {
                setNewPassword(event.target.value)
                setPasswordError(null)
              }}
              placeholder="Nhập mật khẩu mới"
              required
              valid={isPasswordAcceptable(newPassword)}
              value={newPassword}
              variant="outlined"
            />
            <PasswordStrengthBar password={newPassword} />
            <PasswordRules password={newPassword} />
          </div>

          <PasswordField
            autoComplete="new-password"
            hint={confirmError}
            invalid={Boolean(confirmError)}
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              setConfirmError(null)
            }}
            placeholder="Nhập lại mật khẩu mới"
            required
            valid={Boolean(confirmPassword) && confirmPassword === newPassword && isPasswordAcceptable(newPassword)}
            value={confirmPassword}
            variant="outlined"
          />

          <div className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-3 text-xs leading-5 text-indigo-700">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>Tối thiểu 12-128 ký tự, 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt.</span>
          </div>

          <Button
            className="min-h-12 text-[15px]"
            data-testid="auth-reset-submit"
            fullWidth
            loading={isPending}
            size="lg"
            type="submit"
            variant="primary"
          >
            {isPending ? 'Đang lưu mật khẩu…' : 'Lưu mật khẩu mới'}
          </Button>

          {notice && <Banner tone={notice.tone}>{notice.message}</Banner>}

          <Link
            className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            to="/login"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lại trang đăng nhập
          </Link>
        </form>
      </Card>
    </CenterLayout>
  )
}

export default ResetPasswordPage
