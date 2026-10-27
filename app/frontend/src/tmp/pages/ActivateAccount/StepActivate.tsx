import type { FormEvent } from 'react'
import { TextField } from '@/tmp/features/auth/components/TextField'

type StepActivateProps = {
  email: string

  linkSent: boolean
  busy: boolean

  canSignIn: boolean
  link: string
  resendSeconds: number
  onLinkChange: (value: string) => void
  onSubmit: () => void
  onResend: () => void
  onRestart: () => void
}

export function StepActivate(props: StepActivateProps) {
  const { email, linkSent, busy, canSignIn, link, resendSeconds, onLinkChange, onSubmit, onResend, onRestart } = props


  if (!linkSent) {
    return busy ? (
      <p className="cb-note" role="status">Đang kích hoạt tài khoản…</p>
    ) : (
      <div className="cb-form">
        <p className="cb-note">Liên kết này không dùng được. Hãy đăng ký lại để nhận liên kết mới.</p>
        <button className="cb-btn cb-btn--primary cb-btn--block" onClick={onRestart} type="button">Nhận liên kết mới</button>
      </div>
    )
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="cb-form" onSubmit={submit}>
      <p className="cb-note">
        Chúng tôi đã gửi liên kết kích hoạt tới <strong>{email}</strong>. Mở email và bấm vào liên kết, hoặc dán liên kết vào ô bên dưới.
      </p>
      <TextField
        autoComplete="off"
        label="Liên kết kích hoạt"
        onChange={(event) => onLinkChange(event.target.value)}
        placeholder="http://…/verify-email?token=…"
        required
        spellCheck={false}
        value={link}
      />
      <button className="cb-btn cb-btn--primary cb-btn--block" disabled={busy || !link.trim()} type="submit">
        {busy ? 'Đang kích hoạt…' : canSignIn ? 'Hoàn tất kích hoạt & Đăng nhập' : 'Kích hoạt tài khoản'}
      </button>
      <p className="cb-resend">
        Chưa nhận được email?{' '}
        <button className="cb-link" disabled={busy || resendSeconds > 0} onClick={onResend} type="button">
          {resendSeconds > 0 ? `Gửi lại (${resendSeconds}s)` : 'Gửi lại liên kết'}
        </button>
      </p>
    </form>
  )
}
