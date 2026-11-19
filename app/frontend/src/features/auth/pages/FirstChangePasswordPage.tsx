import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, LogOut } from 'lucide-react'
import { Button, Card, notify } from '@/components/common'
import { CenterLayout } from '@/features/auth/components/CenterLayout'
import { PasswordField } from '@/features/auth/components/PasswordField'
import {
  isPasswordAcceptable,
  PASSWORD_MAX_LENGTH,
  PasswordRules,
} from '@/features/auth/components/PasswordRules'
import { PasswordStrengthBar } from '@/features/auth/components/PasswordStrengthBar'
import { useAuth } from '@/features/auth/auth.hook'

export function FirstChangePasswordPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

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

    setIsSubmitting(true)
    await new Promise((resolve) => window.setTimeout(resolve, 350))
    setIsSubmitting(false)
    notify.success('Cập nhật mật khẩu thành công. Chào mừng bạn quay lại hệ thống.')
    navigate('/dashboard', { replace: true })
  }

  return (
    <CenterLayout>
      <Card
        aria-labelledby="first-change-password-title"
        className="mx-auto w-full max-w-[560px] rounded-3xl border-slate-200/70 p-6 shadow-[0_10px_32px_rgba(30,27,75,0.06)] sm:p-10"
        padding="none"
        role="region"
      >
        <h1
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]"
          id="first-change-password-title"
        >
          Đổi mật khẩu lần đầu
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Bạn đang sử dụng mật khẩu tạm. Vui lòng tạo mật khẩu riêng trước khi tiếp tục vào hệ thống.
        </p>

        <form className="mt-6 flex flex-col gap-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2.5">
            <PasswordField
              autoComplete="new-password"
              hint={passwordError}
              invalid={Boolean(passwordError)}
              label="Mật khẩu mới"
              maxLength={PASSWORD_MAX_LENGTH}
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
            maxLength={PASSWORD_MAX_LENGTH}
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
            <span>
              Tối thiểu 12-128 ký tự, 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt. Không dùng lại mật khẩu tạm.
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <Button
              className="min-h-12 px-6 text-[15px]"
              data-testid="auth-first-change-submit"
              loading={isSubmitting}
              size="lg"
              type="submit"
              variant="primary"
            >
              {isSubmitting ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
            </Button>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                to="/dashboard"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                Về trang tổng quan
              </Link>
              <button
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                onClick={signOut}
                type="button"
              >
                <LogOut aria-hidden="true" className="size-3.5" />
                Đăng xuất
              </button>
            </div>
          </div>
        </form>
      </Card>
    </CenterLayout>
  )
}

export default FirstChangePasswordPage
