import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/common'
import { PasswordField } from '@/features/auth/components/PasswordField'
import { isPasswordAcceptable, PASSWORD_MAX_LENGTH, PasswordRules } from '@/features/auth/components/PasswordRules'

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
    <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
      <p className="text-[13px] leading-5 text-slate-700">Liên kết kích hoạt sẽ được gửi tới <strong>{email}</strong>.</p>
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
      <Button className="min-h-11" disabled={!canSubmit} fullWidth loading={busy} size="lg" type="submit" variant="primary">
        {busy ? 'Đang gửi…' : 'Gửi liên kết kích hoạt'}
      </Button>
      <Button className="min-h-11 self-center px-2 text-[13px] text-indigo-600 hover:bg-transparent hover:text-indigo-700 hover:underline" disabled={busy} onClick={onBack} size="sm" type="button" variant="ghost">Sửa thông tin</Button>
    </form>
  )
}
