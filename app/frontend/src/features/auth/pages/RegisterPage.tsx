import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Info, Mail, MailCheck } from 'lucide-react'
import { Button, Card, notify, TextField } from '@/components/common'
import { Banner } from '@/features/auth/components/Banner'
import { CenterLayout } from '@/features/auth/components/CenterLayout'
import { PasswordField } from '@/features/auth/components/PasswordField'
import {
  isPasswordAcceptable,
  PasswordRules,
} from '@/features/auth/components/PasswordRules'
import { PasswordStrengthBar } from '@/features/auth/components/PasswordStrengthBar'
import {
  useRegisterMutation,
  useResendVerificationMutation,
} from '@/features/auth/auth.hook'
import { ApiError, isValidAuthEmail, localizeAuthError } from '@/features/auth/auth.service'
import type { Notice } from '@/features/auth/auth.type'

const PHONE_REGEX = /^0\d{9}$/

type FieldErrors = {
  fullName?: string
  email?: string
  phone?: string
  password?: string
  confirmPassword?: string
}

function describeRegisterError(error: unknown): Notice {
  if (!(error instanceof ApiError)) {
    return { tone: 'error', message: 'Không thể đăng ký lúc này. Vui lòng thử lại sau.' }
  }

  switch (error.status) {
    case 0:
      return { tone: 'error', message: 'Không thể kết nối tới máy chủ. Hãy kiểm tra mạng và thử lại.' }
    case 400:
      return {
        tone: 'error',
        message: localizeAuthError(error, 'Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại.'),
      }
    case 409:
      return {
        tone: 'warning',
        message: 'Email này đã được đăng ký trong hệ thống. Vui lòng đăng nhập hoặc dùng email khác.',
      }
    default:
      return { tone: 'error', message: 'Không thể hoàn tất đăng ký lúc này. Vui lòng thử lại sau.' }
  }
}

export function RegisterPage() {
  const { mutateAsync: registerAccount } = useRegisterMutation()
  const { isPending: isResending, mutateAsync: resendVerification } = useResendVerificationMutation()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const latestEmailRef = useRef(email)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState<Notice | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [resendNotice, setResendNotice] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}
    const normalizedName = fullName.trim()
    const normalizedEmail = email.trim()
    const normalizedPhone = phone.replace(/\s+/g, '')

    if (normalizedName.length < 2 || normalizedName.length > 200) {
      errors.fullName = 'Vui lòng nhập họ và tên đầy đủ.'
    }
    if (!isValidAuthEmail(normalizedEmail)) {
      errors.email = 'Vui lòng nhập địa chỉ email nội bộ hợp lệ.'
    }
    if (!PHONE_REGEX.test(normalizedPhone)) {
      errors.phone = 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.'
    }
    if (!isPasswordAcceptable(password)) {
      errors.password = 'Mật khẩu cần 12-128 ký tự, gồm chữ hoa, chữ số và ký tự đặc biệt.'
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    }
    return errors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isRegistering) return

    setNotice(null)
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const normalizedEmail = email.trim()
    const normalizedPhone = phone.replace(/\s+/g, '')

    setIsRegistering(true)
    try {
      await registerAccount({
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        password,
      })
      setSubmittedEmail(normalizedEmail)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400 && error.message.toLowerCase().includes('email domain')) {
        if (latestEmailRef.current.trim() !== normalizedEmail) return
        setFieldErrors({ email: localizeAuthError(error, 'Tên miền email này không được phép đăng ký.') })
      } else {
        setNotice(describeRegisterError(error))
      }
    } finally {
      setIsRegistering(false)
    }
  }

  const handleResend = async () => {
    if (!submittedEmail || isResending) return
    setResendNotice(null)
    try {
      await resendVerification({ email: submittedEmail })
      setResendNotice('Nếu email này đang chờ xác minh, một liên kết xác minh mới đã được gửi.')
      notify.success('Đã gửi lại email xác minh tài khoản.')
    } catch {
      notify.error('Không thể gửi lại email xác minh lúc này. Hãy thử lại sau.')
    }
  }

  if (submittedEmail) {
    return (
      <CenterLayout>
        <Card
          aria-labelledby="register-sent-title"
          className="mx-auto w-full max-w-[520px] rounded-3xl border-slate-200/70 p-6 text-center shadow-[0_10px_32px_rgba(30,27,75,0.06)] sm:p-10"
          padding="none"
          role="region"
        >
          <div className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
            <MailCheck aria-hidden="true" className="size-8" />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900" id="register-sent-title">
            Kiểm tra email để xác minh tài khoản
          </h1>
          <p className="mt-2.5 text-sm leading-6 text-slate-500">
            Chúng tôi đã gửi liên kết kích hoạt tài khoản tới{' '}
            <span className="font-semibold text-slate-800">{submittedEmail}</span>. Vui lòng mở hộp thư và nhấn vào liên kết để hoàn tất đăng ký.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              className="min-h-12"
              fullWidth
              icon={<Mail aria-hidden="true" className="size-4" />}
              loading={isResending}
              onClick={() => void handleResend()}
              size="lg"
              type="button"
              variant="outline"
            >
              {isResending ? 'Đang gửi lại…' : 'Gửi lại email xác minh'}
            </Button>

            {resendNotice && (
              <p className="text-xs text-emerald-700" role="status">
                {resendNotice}
              </p>
            )}

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
        aria-labelledby="register-title"
        className="mx-auto w-full max-w-[540px] rounded-3xl border-slate-200/70 p-6 shadow-[0_10px_32px_rgba(30,27,75,0.06)] sm:p-10"
        padding="none"
        role="region"
      >
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]" id="register-title">
          Đăng ký tài khoản nhân viên
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Sử dụng email nội bộ được cửa hàng phê duyệt để tạo tài khoản truy cập Mây Portal.
        </p>

        <form className="mt-6 flex flex-col gap-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <TextField
            autoComplete="name"
            hint={fieldErrors.fullName}
            invalid={Boolean(fieldErrors.fullName)}
            label="Họ và tên"
            name="fullName"
            onChange={(event) => {
              setFullName(event.target.value)
              setFieldErrors((prev) => ({ ...prev, fullName: undefined }))
            }}
            placeholder="Nguyễn Minh Anh"
            required
            type="text"
            value={fullName}
            variant="outlined"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              autoComplete="email"
              hint={fieldErrors.email && <span role="alert">{fieldErrors.email}</span>}
              invalid={Boolean(fieldErrors.email)}
              label="Email nội bộ"
              name="email"
              onChange={(event) => {
                const nextEmail = event.target.value
                latestEmailRef.current = nextEmail
                setEmail(nextEmail)
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }}
              placeholder="nv.phong@nhasachmay.vn"
              required
              type="email"
              value={email}
              variant="outlined"
            />

            <TextField
              autoComplete="tel"
              hint={fieldErrors.phone}
              invalid={Boolean(fieldErrors.phone)}
              label="Số điện thoại"
              name="phone"
              onChange={(event) => {
                setPhone(event.target.value)
                setFieldErrors((prev) => ({ ...prev, phone: undefined }))
              }}
              placeholder="0903123456"
              required
              type="tel"
              value={phone}
              variant="outlined"
            />
          </div>

          <div className="space-y-2.5">
            <PasswordField
              autoComplete="new-password"
              hint={fieldErrors.password}
              invalid={Boolean(fieldErrors.password)}
              label="Mật khẩu"
              name="password"
              onChange={(event) => {
                setPassword(event.target.value)
                setFieldErrors((prev) => ({ ...prev, password: undefined }))
              }}
              placeholder="Tối thiểu 12 ký tự"
              required
              valid={isPasswordAcceptable(password)}
              value={password}
              variant="outlined"
            />
            <PasswordStrengthBar password={password} />
            <PasswordRules password={password} />
          </div>

          <PasswordField
            autoComplete="new-password"
            hint={fieldErrors.confirmPassword}
            invalid={Boolean(fieldErrors.confirmPassword)}
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
            }}
            placeholder="Nhập lại mật khẩu"
            required
            valid={Boolean(confirmPassword) && confirmPassword === password && isPasswordAcceptable(password)}
            value={confirmPassword}
            variant="outlined"
          />

          <div className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-3 text-xs leading-5 text-indigo-700">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>Tối thiểu 12-128 ký tự, 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt.</span>
          </div>

          <Button
            className="min-h-12 text-[15px]"
            data-testid="auth-register-submit"
            fullWidth
            loading={isRegistering}
            size="lg"
            type="submit"
            variant="primary"
          >
            {isRegistering ? 'Đang đăng ký…' : 'Đăng ký'}
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

export default RegisterPage
