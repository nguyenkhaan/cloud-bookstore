import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '@/components/common'
import { extractActivationToken } from '@/features/auth/activation'
import { Banner } from '@/features/auth/components/Banner'
import { ArrowLeftIcon } from '@/features/auth/components/Icons'
import { CenterLayout } from '@/features/auth/components/CenterLayout'
import { Stepper } from '@/features/auth/components/Stepper'
import { describeRegisterError, describeVerifyError } from '@/features/auth/errors'
import type { Notice } from '@/features/auth/errors'
import { useCountdown } from '@/features/auth/auth.hook'
import { ApiError } from '@/features/auth/auth.service'
import { useAuth, useRegisterMutation, useVerifyMutation } from '@/features/auth/auth.hook'
import { StepActivate } from './StepActivate'
import { StepDone } from './StepDone'
import { StepInfo } from './StepInfo'
import type { AccountInfo } from '@/features/auth/auth.type'
import { StepPassword } from './StepPassword'

type Step = 'info' | 'password' | 'activate' | 'done'

const STEPS = ['Thông tin', 'Mật khẩu', 'Kích hoạt'] as const
const STEP_INDEX: Record<Step, number> = { info: 0, password: 1, activate: 2, done: STEPS.length }
const RESEND_SECONDS = 60

export function ActivateAccountPage({ search }: { search: string }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { mutateAsync: registerAccount } = useRegisterMutation()
  const { mutateAsync: verifyAccount } = useVerifyMutation()

  const [linkToken] = useState(() => new URLSearchParams(search).get('token'))
  const [step, setStep] = useState<Step>(linkToken ? 'activate' : 'info')
  const [info, setInfo] = useState<AccountInfo>({ fullName: '', email: '', phone: '' })
  const [password, setPassword] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isBusy, setIsBusy] = useState(Boolean(linkToken))
  const { remaining, start } = useCountdown()
  const requestedToken = useRef<string | null>(null)


  useEffect(() => {
    if (!linkToken || requestedToken.current === linkToken) return
    requestedToken.current = linkToken
    window.history.replaceState(null, '', '/activate')
    verifyAccount({ token: linkToken })
      .then(() => setStep('done'))
      .catch((error: unknown) => setNotice(describeVerifyError(error)))
      .finally(() => setIsBusy(false))
  }, [linkToken, verifyAccount])

  const submitRegistration = async (): Promise<boolean> => {
    setIsBusy(true)
    setNotice(null)
    try {
      await registerAccount({
        fullName: info.fullName.trim(),
        email: info.email.trim(),
        phone: info.phone.trim(),
        password,
      })
      setLinkSent(true)
      start(RESEND_SECONDS)
      return true
    } catch (error) {
      setNotice(describeRegisterError(error))

      if (error instanceof ApiError && (error.status === 400 || error.status === 409)) setStep('info')
      return false
    } finally {
      setIsBusy(false)
    }
  }

  const handlePasswordSubmit = async () => {
    if (await submitRegistration()) setStep('activate')
  }

  const handleResend = async () => {
    if (await submitRegistration()) {
      setNotice({ tone: 'success', message: 'Đã gửi lại liên kết kích hoạt. Liên kết trước đó không còn dùng được.' })
    }
  }

  const handleLinkSubmit = async () => {
    const token = extractActivationToken(linkInput)
    if (!token) {
      setNotice({ tone: 'error', message: 'Liên kết không hợp lệ. Hãy dán đầy đủ liên kết trong email.' })
      return
    }

    setIsBusy(true)
    setNotice(null)
    try {
      await verifyAccount({ token })
    } catch (error) {
      setNotice(describeVerifyError(error))
      setIsBusy(false)
      return
    }

    const canSignIn = password !== '' && info.email.trim() !== ''
    if (canSignIn) {
      try {
        await login(info.email, password)
        navigate('/dashboard', { replace: true })
        return
      } catch {

      }
    }
    setPassword('')
    setStep('done')
    setIsBusy(false)
  }

  const restart = () => {
    setNotice(null)
    setStep('info')
  }

  const goToPasswordStep = () => {
    setNotice(null)
    setStep('password')
  }

  return (
    <CenterLayout>
      <Card aria-labelledby="activate-title" className="mx-auto w-full max-w-[540px] rounded-3xl border-slate-200/70 p-5 shadow-[0_8px_28px_rgba(30,27,75,0.06)] sm:p-9" padding="none" role="region">
        <h1 className="text-[28px] font-bold leading-tight text-indigo-950" id="activate-title">Kích hoạt tài khoản nhân viên</h1>
        <p className="mt-2.5 text-sm text-slate-500">Email của bạn cần được Quản trị viên thêm vào danh sách cho phép trước khi kích hoạt.</p>
        <Stepper current={STEP_INDEX[step]} steps={STEPS} />

        <div className="flex flex-col gap-4">
          {step === 'info' && <StepInfo onChange={setInfo} onNext={goToPasswordStep} values={info} />}
          {step === 'password' && (
            <StepPassword
              busy={isBusy}
              email={info.email.trim()}
              onBack={restart}
              onPasswordChange={setPassword}
              onSubmit={() => void handlePasswordSubmit()}
              password={password}
            />
          )}
          {step === 'activate' && (
            <StepActivate
              busy={isBusy}
              canSignIn={password !== ''}
              email={info.email.trim()}
              link={linkInput}
              linkSent={linkSent}
              onLinkChange={setLinkInput}
              onRestart={restart}
              onResend={() => void handleResend()}
              onSubmit={() => void handleLinkSubmit()}
              resendSeconds={remaining}
            />
          )}
          {step === 'done' && <StepDone />}
          {notice && <Banner tone={notice.tone}>{notice.message}</Banner>}
        </div>

        {step !== 'done' && (
          <Button className="mt-5 min-h-11 px-1 text-[13px] text-indigo-600 hover:bg-transparent hover:text-indigo-700 hover:underline" icon={<ArrowLeftIcon />} onClick={() => navigate('/login')} size="sm" type="button" variant="ghost">Quay lại đăng nhập</Button>
        )}
      </Card>
    </CenterLayout>
  )
}

export default ActivateAccountPage

