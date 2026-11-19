import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Circle, KeyRound, X } from 'lucide-react'
import { Button } from '@/components/common'
import { cn } from '@/lib/cn'
import { PasswordField } from './PasswordField'
import {
  getPasswordChecks,
  isPasswordAcceptable,
  PASSWORD_MAX_LENGTH,
} from './PasswordRules'
import { PasswordStrengthBar } from './PasswordStrengthBar'

type ChangePasswordModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const checklistItems = [
  { key: 'length', label: 'Tối thiểu 12-128 ký tự' },
  { key: 'upper', label: 'Bao gồm ít nhất 1 chữ hoa (A-Z)' },
  { key: 'digit', label: 'Bao gồm ít nhất 1 chữ số (0-9)' },
  { key: 'special', label: 'Bao gồm ít nhất 1 ký tự đặc biệt' },
] as const

export function ChangePasswordModal({ open, onClose, onSuccess }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [newError, setNewError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isSubmitting, onClose])

  if (!open) return null

  const checks = getPasswordChecks(newPassword)
  const isNewValid = isPasswordAcceptable(newPassword)
  const isConfirmValid = Boolean(confirmPassword) && confirmPassword === newPassword && isNewValid

  const resetAndClose = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setCurrentError(null)
    setNewError(null)
    setConfirmError(null)
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    let hasError = false
    if (!currentPassword.trim()) {
      setCurrentError('Vui lòng nhập mật khẩu hiện tại.')
      hasError = true
    } else {
      setCurrentError(null)
    }

    if (!isNewValid) {
      setNewError('Mật khẩu mới cần 12-128 ký tự, gồm chữ hoa, chữ số và ký tự đặc biệt.')
      hasError = true
    } else if (newPassword === currentPassword) {
      setNewError('Mật khẩu mới không được trùng với mật khẩu hiện tại.')
      hasError = true
    } else {
      setNewError(null)
    }

    if (confirmPassword !== newPassword) {
      setConfirmError('Mật khẩu xác nhận không khớp.')
      hasError = true
    } else {
      setConfirmError(null)
    }

    if (hasError) return

    setIsSubmitting(true)
    await new Promise((resolve) => window.setTimeout(resolve, 300))
    setIsSubmitting(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    onSuccess()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          resetAndClose()
        }
      }}
    >
      <div
        aria-labelledby="change-password-modal-title"
        aria-modal="true"
        className="w-full max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        data-testid="change-password-modal"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <KeyRound aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900" id="change-password-modal-title">
                Đổi mật khẩu tài khoản
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Tạo mật khẩu mạnh để bảo vệ tài khoản nhân viên của bạn.
              </p>
            </div>
          </div>

          <button
            aria-label="Đóng hộp thoại đổi mật khẩu"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            disabled={isSubmitting}
            onClick={resetAndClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <form className="mt-5 flex flex-col gap-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <PasswordField
            autoComplete="current-password"
            hint={currentError}
            invalid={Boolean(currentError)}
            label="Mật khẩu hiện tại *"
            name="currentPassword"
            onChange={(event) => {
              setCurrentPassword(event.target.value)
              setCurrentError(null)
            }}
            placeholder="Nhập mật khẩu hiện tại"
            required
            value={currentPassword}
            variant="outlined"
          />

          <div className="space-y-2.5">
            <PasswordField
              autoComplete="new-password"
              hint={newError}
              invalid={Boolean(newError)}
              label="Mật khẩu mới *"
              maxLength={PASSWORD_MAX_LENGTH}
              name="newPassword"
              onChange={(event) => {
                setNewPassword(event.target.value)
                setNewError(null)
              }}
              placeholder="Nhập mật khẩu mới"
              required
              valid={isNewValid}
              value={newPassword}
              variant="outlined"
            />
            <PasswordStrengthBar password={newPassword} variant="split" />
            <ul aria-label="Tiêu chí mật khẩu" className="space-y-1.5 pt-0.5">
              {checklistItems.map((item) => {
                const met = checks[item.key]
                return (
                  <li
                    className={cn(
                      'flex items-center gap-2 text-xs',
                      met ? 'font-medium text-emerald-700' : 'text-slate-500',
                    )}
                    key={item.key}
                  >
                    {met ? (
                      <Check aria-hidden="true" className="size-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle aria-hidden="true" className="size-3 shrink-0 text-slate-300" />
                    )}
                    <span>{item.label}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <PasswordField
            autoComplete="new-password"
            hint={confirmError}
            invalid={Boolean(confirmError)}
            label="Xác nhận mật khẩu mới *"
            maxLength={PASSWORD_MAX_LENGTH}
            name="confirmPassword"
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              setConfirmError(null)
            }}
            placeholder="Nhập lại mật khẩu mới"
            required
            valid={isConfirmValid}
            value={confirmPassword}
            variant="outlined"
          />

          <div className="mt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              className="min-h-11 px-4"
              disabled={isSubmitting}
              onClick={resetAndClose}
              size="md"
              type="button"
              variant="secondary"
            >
              Hủy bỏ
            </Button>
            <Button
              className="min-h-11 px-5"
              loading={isSubmitting}
              size="md"
              type="submit"
              variant="primary"
            >
              {isSubmitting ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
