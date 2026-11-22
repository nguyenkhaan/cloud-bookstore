import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, MailCheck } from 'lucide-react'
import { Button, Card, notify, TextField } from '@/components/common'
import { Banner } from '@/features/auth/components/Banner'
import { CenterLayout } from '@/features/auth/components/CenterLayout'
import { useRequestPasswordResetMutation } from '@/features/auth/auth.hook'
import { ApiError } from '@/features/auth/auth.service'
import type { Notice } from '@/features/auth/auth.type'

export function ForgotPasswordPage() {
  const { isPending, mutateAsync: requestReset } = useRequestPasswordResetMutation()
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) return

    const normalizedEmail = email.trim()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setEmailError('Vui lòng nhập địa chỉ email nội bộ hợp lệ.')
      return
    }

    setEmailError(null)
    setNotice(null)
    try {
      await requestReset({ email: normalizedEmail })
      setSubmittedEmail(normalizedEmail)
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        setNotice({
          tone: 'error',
          message: 'Không thể kết nối tới máy chủ. Hãy kiểm tra mạng và thử lại.',
        })
      } else {
        setNotice({
          tone: 'error',
          message: 'Không thể gửi yêu cầu khôi phục lúc này. Vui lòng thử lại sau.',
        })
      }
    }
  }

  const handleResend = async () => {
    if (!submittedEmail || isPending) return
    try {
      await requestReset({ email: submittedEmail })
      notify.success('Đã gửi lại email khôi phục mật khẩu.')
    } catch {
      notify.error('Không thể gửi lại email khôi phục lúc này. Vui lòng thử lại sau.')
    }
  }

  if (submittedEmail) {
    return (
      <CenterLayout>
        <Card
          aria-labelledby="forgot-sent-title"
          className="mx-auto w-full max-w-[520px] rounded-3xl border-slate-200/70 p-6 text-center shadow-[0_10px_32px_rgba(30,27,75,0.06)] sm:p-10"
          padding="none"
          role="region"
        >
          <div className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
            <MailCheck aria-hidden="true" className="size-8" />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900" id="forgot-sent-title">
            Đã gửi email khôi phục
          </h1>
          <p className="mt-2.5 text-sm leading-6 text-slate-500">
            Nếu địa chỉ{' '}
            <span className="font-semibold text-slate-800">{submittedEmail}</span> tồn tại trong hệ thống, liên kết đặt lại mật khẩu có hiệu lực trong vòng 15 phút đã được gửi tới hộp thư của bạn.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              className="min-h-12"
              fullWidth
              icon={<Mail aria-hidden="true" className="size-4" />}
              loading={isPending}
              onClick={() => void handleResend()}
              size="lg"
              type="button"
              variant="outline"
            >
              {isPending ? 'Đang gửi lại…' : 'Gửi lại email khôi phục'}
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
        aria-labelledby="forgot-title"
        className="mx-auto w-full max-w-[520px] rounded-3xl border-slate-200/70 p-6 shadow-[0_10px_32px_rgba(30,27,75,0.06)] sm:p-10"
        padding="none"
        role="region"
      >
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]" id="forgot-title">
          Quên mật khẩu?
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Nhập email nội bộ được duyệt bởi cửa hàng để nhận liên kết xác minh đặt lại mật khẩu.
        </p>

        <form className="mt-6 flex flex-col gap-5" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <TextField
            autoComplete="email"
            hint={emailError ?? 'Liên kết xác minh sẽ có hiệu lực trong vòng 15 phút.'}
            invalid={Boolean(emailError)}
            label="Email"
            name="email"
            onChange={(event) => {
              setEmail(event.target.value)
              setEmailError(null)
            }}
            placeholder="nv.phong@nhasachmay.vn"
            required
            type="email"
            value={email}
            variant="outlined"
          />

          <Button
            className="min-h-12 text-[15px]"
            data-testid="auth-forgot-submit"
            fullWidth
            loading={isPending}
            size="lg"
            type="submit"
            variant="primary"
          >
            {isPending ? 'Đang gửi…' : 'Gửi liên kết khôi phục'}
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

export default ForgotPasswordPage
