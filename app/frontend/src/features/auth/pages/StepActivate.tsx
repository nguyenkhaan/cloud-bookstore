import type { FormEvent } from 'react'
import { Button, TextField } from '@/components/common'

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
      <p className="mt-5 text-[13px] leading-5 text-slate-700" role="status">Đang kích hoạt tài khoản…</p>
    ) : (
      <div className="mt-5 flex flex-col gap-4">
        <p className="text-[13px] leading-5 text-slate-700">Liên kết này không dùng được. Hãy đăng ký lại để nhận liên kết mới.</p>
        <Button className="min-h-11" fullWidth onClick={onRestart} size="lg" type="button" variant="primary">Nhận liên kết mới</Button>
      </div>
    )
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
      <p className="text-[13px] leading-5 text-slate-700">
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
      <Button className="min-h-11" disabled={busy || !link.trim()} fullWidth loading={busy} size="lg" type="submit" variant="primary">
        {busy ? 'Đang kích hoạt…' : canSignIn ? 'Hoàn tất kích hoạt & Đăng nhập' : 'Kích hoạt tài khoản'}
      </Button>
      <p className="text-center text-[13px] text-slate-500">
        Chưa nhận được email?{' '}
        <Button className="min-h-11 px-1 text-[13px] text-indigo-600 hover:bg-transparent hover:text-indigo-700 hover:underline" disabled={busy || resendSeconds > 0} onClick={onResend} size="sm" type="button" variant="ghost">
          {resendSeconds > 0 ? `Gửi lại (${resendSeconds}s)` : 'Gửi lại liên kết'}
        </Button>
      </p>
    </form>
  )
}
