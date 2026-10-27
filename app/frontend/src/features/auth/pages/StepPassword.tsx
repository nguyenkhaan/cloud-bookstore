import { useState } from 'react'
import type { FormEvent } from 'react'
import { isPasswordAcceptable, PASSWORD_MAX_LENGTH } from '@/tmp/auth/password'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { PasswordRules } from '@/features/auth/components/PasswordRules'

type StepPasswordProps = {
  email: string
  password: string
  busy: boolean
  onPasswordChange: (value: string) => void
  onBack: () => void
  onSubmit: () => void
}

export function StepPassword({ email, password, busy, onPasswordChange, onBack, onSubmit }: StepPasswordProps) {
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm.length > 0 && confirm !== password
  const canSubmit = isPasswordAcceptable(password) && password === confirm && !busy

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (canSubmit) onSubmit()
  }

  return (
    <form className="cb-form" onSubmit={submit}>
      <p className="cb-note">Liên kết kích hoạt sẽ được gửi tới <strong>{email}</strong>.</p>
      <PasswordField
        autoComplete="new-password"
        hint={<PasswordRules password={password} />}
        label="Mật khẩu mới"
        maxLength={PASSWORD_MAX_LENGTH}
        onChange={(event) => onPasswordChange(event.target.value)}
        required
        value={password}
      />
      <PasswordField
        autoComplete="new-password"
        hint={mismatch ? 'Mật khẩu xác nhận chưa khớp.' : undefined}
        invalid={mismatch}
        label="Xác nhận mật khẩu"
        maxLength={PASSWORD_MAX_LENGTH}
        onChange={(event) => setConfirm(event.target.value)}
        required
        value={confirm}
      />
      <button className="cb-btn cb-btn--primary cb-btn--block" disabled={!canSubmit} type="submit">
        {busy ? 'Đang gửi…' : 'Gửi liên kết kích hoạt'}
      </button>
      <button className="cb-link cb-link--center" disabled={busy} onClick={onBack} type="button">Sửa thông tin</button>
    </form>
  )
}
