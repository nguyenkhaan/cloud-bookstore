import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button, notify } from '@/components/common'
import { useChangePasswordMutation } from '../auth.hook'
import { localizeAuthError } from '../auth.service'
import { Banner } from './Banner'
import { PasswordField } from './PasswordField'
import { isPasswordAcceptable, PASSWORD_MAX_LENGTH, PasswordRules } from './PasswordRules'
import { PasswordStrengthBar } from './PasswordStrengthBar'

type PasswordValues = { currentPassword: string; newPassword: string; confirmPassword: string }
type PasswordErrors = Partial<Record<keyof PasswordValues, string>>

type ChangePasswordFormProps = {
  onSuccess: () => void
  onCancel?: () => void
  submitTestId?: string
  onPendingChange?: (pending: boolean) => void
}

export function ChangePasswordForm({ onSuccess, onCancel, onPendingChange, submitTestId }: ChangePasswordFormProps) {
  const { mutateAsync, isPending } = useChangePasswordMutation()
  const [values, setValues] = useState<PasswordValues>({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState<PasswordErrors>({})
  const [requestError, setRequestError] = useState<string | null>(null)
  const { currentPassword, newPassword, confirmPassword } = values

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return
    const nextErrors: PasswordErrors = {}
    if (!currentPassword) nextErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
    if (!isPasswordAcceptable(newPassword)) {
      nextErrors.newPassword = 'Mật khẩu mới cần 12-128 ký tự, gồm chữ hoa, chữ số và ký tự đặc biệt.'
    } else if (newPassword === currentPassword) {
      nextErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.'
    }
    if (!confirmPassword || confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    }
    setErrors(nextErrors)
    setRequestError(null)
    if (Object.keys(nextErrors).length) return

    onPendingChange?.(true)
    try {
      await mutateAsync({ currentPassword, newPassword })
      onSuccess()
    } catch (error) {
      const message = localizeAuthError(error, 'Không thể cập nhật mật khẩu lúc này. Vui lòng thử lại.')
      if (message === 'Mật khẩu hiện tại không chính xác.') {
        setErrors({ currentPassword: message })
      } else {
        setRequestError(message)
      }
    } finally {
      onPendingChange?.(false)
    }
  }

  function setField(field: keyof PasswordValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setRequestError(null)
  }

  return (
    <form className="mt-6 flex flex-col gap-4" noValidate onSubmit={(event) => void handleSubmit(event)}>
      <PasswordField
        autoComplete="current-password" hint={errors.currentPassword} invalid={Boolean(errors.currentPassword)}
        label="Mật khẩu hiện tại" name="currentPassword" onChange={(event) => setField('currentPassword', event.target.value)}
        required value={currentPassword} variant="outlined"
      />
      <div className="space-y-2.5">
        <PasswordField
          autoComplete="new-password" hint={errors.newPassword} invalid={Boolean(errors.newPassword)}
          label="Mật khẩu mới" maxLength={PASSWORD_MAX_LENGTH} name="newPassword"
          onChange={(event) => setField('newPassword', event.target.value)} required value={newPassword} variant="outlined"
        />
        <PasswordStrengthBar password={newPassword} />
        <PasswordRules password={newPassword} />
      </div>
      <PasswordField
        autoComplete="new-password" hint={errors.confirmPassword} invalid={Boolean(errors.confirmPassword)}
        label="Xác nhận mật khẩu mới" maxLength={PASSWORD_MAX_LENGTH} name="confirmPassword"
        onChange={(event) => setField('confirmPassword', event.target.value)} required value={confirmPassword} variant="outlined"
      />
      {requestError && <Banner tone="error">{requestError}</Banner>}
      <div className={onCancel ? 'flex flex-wrap justify-end gap-2' : undefined}>
        {onCancel && <Button className="min-h-11" disabled={isPending} onClick={onCancel} type="button" variant="outline">Hủy</Button>}
        <Button className="min-h-11" data-testid={submitTestId} fullWidth={!onCancel} loading={isPending} type="submit" variant="primary">
          {isPending ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
        </Button>
      </div>
    </form>
  )
}

function OpenChangePasswordModal({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [isPending, setIsPending] = useState(false)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog aria-labelledby="change-password-modal-title" className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[540px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-slate-900/50" data-testid="change-password-modal" ref={dialog} onCancel={(event) => {
      event.preventDefault()
      if (!isPending) onClose()
    }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900" id="change-password-modal-title">Đổi mật khẩu tài khoản</h2>
        <Button aria-label="Đóng" className="min-h-11 min-w-11" disabled={isPending} onClick={onClose} type="button" variant="ghost">
          <X aria-hidden="true" className="size-5" />
        </Button>
      </div>
      <ChangePasswordForm onCancel={onClose} onPendingChange={setIsPending} onSuccess={() => {
        notify.success('Đổi mật khẩu thành công.')
        onClose()
      }} />
    </dialog>
  )
}

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <OpenChangePasswordModal onClose={onClose} /> : null
}
