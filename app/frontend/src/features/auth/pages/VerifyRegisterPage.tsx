import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Check, LoaderCircle, Mail } from 'lucide-react'
import { Button, Card, notify, TextField } from '@/components/common'
import { CenterLayout } from '@/features/auth/components/CenterLayout'
import { useResendVerificationMutation, useVerifyMutation } from '@/features/auth/auth.hook'
import { isValidAuthEmail } from '@/features/auth/auth.service'
import { getVerificationToken } from '@/features/auth/verification'

type VerificationState = 'verifying' | 'success' | 'failed'

const invalidLinkMessage = 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.'

export function VerifyRegisterPage({ search }: { search: string }) {
  const navigate = useNavigate()
  const [token] = useState(() => getVerificationToken(search))
  const requestedToken = useRef<string | null | undefined>(undefined)
  const { mutateAsync: verifyAccount } = useVerifyMutation()
  const { isPending: isResending, mutateAsync: resendVerification } = useResendVerificationMutation()
  const [email, setEmail] = useState('')
  const [resendComplete, setResendComplete] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [failedToken, setFailedToken] = useState<string | null>(null)
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null)
  const state: VerificationState = !token || failedToken === token
    ? 'failed'
    : verifiedToken === token
      ? 'success'
      : 'verifying'

  useLayoutEffect(() => {
    if (new URLSearchParams(window.location.search).has('token')) {
      window.history.replaceState(null, '', '/verify-register')
    }
  }, [])

  useEffect(() => {
    if (requestedToken.current === token) return
    requestedToken.current = token

    if (!token) {
      notify.error(invalidLinkMessage)
      return
    }

    void verifyAccount({ token })
      .then(() => {
        setVerifiedToken(token)
        notify.success('Tài khoản đã được xác minh thành công.')
      })
      .catch(() => {
        setFailedToken(token)
        notify.error(invalidLinkMessage)
      })
  }, [token, verifyAccount])

  const handleResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (isResending) return
    setResendComplete(false)
    if (!isValidAuthEmail(normalizedEmail)) {
      setResendError('Vui lòng nhập địa chỉ email nội bộ hợp lệ.')
      return
    }
    setResendError(null)

    try {
      await resendVerification({ email: normalizedEmail })
      setResendComplete(true)
    } catch {
      setResendError('Không thể gửi lại email xác minh lúc này. Hãy thử lại sau.')
    }
  }

  return (
    <CenterLayout>
      <Card
        aria-labelledby="verify-register-title"
        className="mx-auto w-full max-w-[520px] rounded-3xl border-slate-200/70 p-6 text-center shadow-[0_10px_32px_rgba(30,27,75,0.06)] sm:p-10"
        padding="none"
        role="region"
      >
        {state === 'verifying' && (
          <div aria-busy="true" className="flex flex-col items-center py-6" role="status">
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600">
              <LoaderCircle aria-hidden="true" className="size-8 animate-spin motion-reduce:animate-none" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900" id="verify-register-title">
              Đang xác minh tài khoản
            </h1>
            <p className="mt-2.5 text-sm text-slate-500">Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center py-4" role="status">
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
              <Check aria-hidden="true" className="size-8 stroke-[2.5]" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900" id="verify-register-title">
              Xác minh thành công!
            </h1>
            <p className="mt-2.5 max-w-sm text-sm leading-6 text-slate-500">
              Tài khoản của bạn đã sẵn sàng. Hãy đăng nhập để bắt đầu làm việc.
            </p>
            <Button
              className="mt-7 min-h-12 text-[15px]"
              fullWidth
              onClick={() => navigate('/login?activated=1', { replace: true })}
              size="lg"
              type="button"
              variant="primary"
            >
              Đăng nhập ngay
            </Button>
          </div>
        )}

        {state === 'failed' && (
          <div className="py-2">
            <div className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600">
              <AlertCircle aria-hidden="true" className="size-8" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900" id="verify-register-title">
              Liên kết xác minh không hợp lệ hoặc đã hết hạn
            </h1>
            <p className="mt-2.5 text-sm leading-6 text-slate-500">
              Nhập email nội bộ đã đăng ký để nhận liên kết xác minh mới.
            </p>

            <form className="mt-6 flex flex-col gap-4 text-left" noValidate onSubmit={(event) => void handleResend(event)}>
              <TextField
                autoComplete="email"
                hint={resendError}
                invalid={Boolean(resendError)}
                label="Email nội bộ"
                name="email"
                onChange={(event) => {
                  setEmail(event.target.value)
                  setResendComplete(false)
                  setResendError(null)
                }}
                placeholder="nv.phong@nhasachmay.vn"
                required
                type="email"
                value={email}
                variant="outlined"
              />
              <Button
                className="min-h-12 text-[15px]"
                disabled={isResending}
                fullWidth
                icon={
                  isResending ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Mail aria-hidden="true" className="size-4" />
                  )
                }
                size="lg"
                type="submit"
                variant="primary"
              >
                {isResending ? 'Đang gửi…' : 'Gửi lại email xác minh'}
              </Button>
            </form>

            {resendComplete && (
              <p className="mt-4 text-xs text-emerald-700" role="status">
                Nếu email này đang chờ xác minh, một liên kết mới đã được gửi.
              </p>
            )}

            <Link
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              to="/login"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Quay lại trang đăng nhập
            </Link>
          </div>
        )}
      </Card>
    </CenterLayout>
  )
}

export default VerifyRegisterPage
