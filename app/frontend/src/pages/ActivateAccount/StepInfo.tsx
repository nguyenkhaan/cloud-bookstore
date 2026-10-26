import type { ChangeEvent, FormEvent } from 'react'
import { TextField } from '@/features/auth/components/TextField'

export type AccountInfo = { fullName: string; email: string; phone: string }

type StepInfoProps = { values: AccountInfo; onChange: (values: AccountInfo) => void; onNext: () => void }

export function StepInfo({ values, onChange, onNext }: StepInfoProps) {
  const set = (field: keyof AccountInfo) => (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...values, [field]: event.target.value })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onNext()
  }

  return (
    <form className="cb-form" onSubmit={submit}>
      <TextField autoComplete="name" label="Họ và tên" onChange={set('fullName')} required value={values.fullName} />
      <TextField
        autoComplete="email"
        hint="Email cần được Quản trị viên cấp quyền trước khi kích hoạt."
        label="Email công vụ"
        onChange={set('email')}
        required
        type="email"
        value={values.email}
      />
      <TextField
        autoComplete="tel"
        inputMode="numeric"
        label="Số điện thoại"
        onChange={set('phone')}
        pattern="0[0-9]{9}"
        required
        title="Gồm 10 chữ số và bắt đầu bằng 0"
        type="tel"
        value={values.phone}
      />
      <button className="cb-btn cb-btn--primary cb-btn--block" type="submit">Tiếp tục</button>
    </form>
  )
}
