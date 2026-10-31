import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CircleCheck, CircleX, LoaderCircle, LogIn, Mail } from 'lucide-react'
import { Button, Card, notify, TextField } from '@/components/common'
import { CenterLayout } from '@/features/auth/components/CenterLayout'
import { useResendVerificationMutation, useVerifyMutation } from '@/features/auth/auth.hook'
import { getVerificationToken } from '@/features/auth/verification'
import { useNavigate } from 'react-router-dom'

type VerificationState = 'verifying' | 'success' | 'failed'

const invalidLinkMessage = 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.'

export function VerifyRegisterPage({ search }: { search: string }) {
  const navigate = useNavigate()
  const token = getVerificationToken(search)
  const requestedToken = useRef<string | null | undefined>(undefined)
  const { mutateAsync: verifyAccount } = useVerifyMutation()
  const { isPending: isResending, mutateAsync: resendVerification } = useResendVerificationMutation()
  const [email, setEmail] = useState('')
  const [resendComplete, setResendComplete] = useState(false)
  const [failedToken, setFailedToken] = useState<string | null>(null)
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null)
  const state: VerificationState = !token || failedToken === token
    ? 'failed'
    : verifiedToken === token
      ? 'success'
      : 'verifying'

  useEffect(() => {
    if (requestedToken.current === token) return
    requestedToken.current = token

    if (!token) {
      notify.error(invalidLinkMessage)
      return
    }

    window.history.replaceState(null, '', '/verify-register')
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
    if (!normalizedEmail || isResending) return

    try {
      await resendVerification({ email: normalizedEmail })
      setResendComplete(true)
      notify.success('Nếu email này đang chờ xác minh, một liên kết mới đã được gửi.')
    } catch {
      notify.error('Không thể gửi lại email xác minh lúc này. Hãy thử lại sau.')
    }
  }

  return (
    <CenterLayout>
      <Card aria-labelledby="verify-register-title" className="mx-auto w-full max-w-[540px] rounded-3xl border-slate-200/70 p-5 text-center shadow-[0_8px_28px_rgba(30,27,75,0.06)] sm:p-9" padding="none" role="region">
        {state === 'verifying' && (
          <div aria-busy="true" className="flex flex-col items-center py-7" role="status">
            <LoaderCircle aria-hidden="true" className="h-12 w-12 animate-spin text-indigo-600 motion-reduce:animate-none" />
            <h1 className="mt-5 text-[28px] font-bold leading-tight text-indigo-950" id="verify-register-title">Đang xác minh tài khoản</h1>
            <p className="mt-2.5 text-sm text-slate-500">Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center py-7" role="status">
            <CircleCheck aria-hidden="true" className="h-14 w-14 text-emerald-600" />
            <h1 className="mt-5 text-[28px] font-bold leading-tight text-indigo-950" id="verify-register-title">Xác minh thành công</h1>
            <p className="mt-2.5 max-w-sm text-sm text-slate-500">Tài khoản của bạn đã sẵn sàng. Hãy đăng nhập để bắt đầu làm việc.</p>
            <Button className="mt-7 min-h-11" icon={<LogIn aria-hidden="true" className="h-4 w-4" />} onClick={() => navigate('/login?activated=1', { replace: true })} size="lg" type="button" variant="primary">
              Đến trang đăng nhập
            </Button>
          </div>
        )}

        {state === 'failed' && (
          <div className="py-3 sm:py-5">
            <CircleX aria-hidden="true" className="mx-auto h-14 w-14 text-rose-600" />
            <h1 className="mt-5 text-[28px] font-bold leading-tight text-indigo-950" id="verify-register-title">Không thể xác minh tài khoản</h1>
            <p className="mt-2.5 text-sm text-slate-500">{invalidLinkMessage} Nhập email công vụ để nhận liên kết mới.</p>

            <form className="mt-6 flex flex-col gap-4 text-left" onSubmit={(event) => void handleResend(event)}>
              <TextField
                autoComplete="email"
                label="Email công vụ"
                name="email"
                onChange={(event) => {
                  setEmail(event.target.value)
                  setResendComplete(false)
                }}
                required
                type="email"
                value={email}
              />
              <Button className="min-h-11" disabled={isResending} fullWidth icon={isResending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Mail aria-hidden="true" className="h-4 w-4" />} size="lg" type="submit" variant="primary">
                {isResending ? 'Đang gửi…' : 'Gửi lại email xác minh'}
              </Button>
            </form>

            {resendComplete && <p className="mt-4 text-sm text-emerald-700" role="status">Nếu email này đang chờ xác minh, một liên kết mới đã được gửi.</p>}
          </div>
        )}
      </Card>
    </CenterLayout>
  )
}

export default VerifyRegisterPage
