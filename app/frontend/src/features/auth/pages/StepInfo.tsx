import type { ChangeEvent, FormEvent } from 'react'
import { Button, TextField } from '@/components/common'
import type { AccountInfo } from '@/features/auth/auth.type'

type StepInfoProps = { values: AccountInfo; onChange: (values: AccountInfo) => void; onNext: () => void }

export function StepInfo({ values, onChange, onNext }: StepInfoProps) {
  const set = (field: keyof AccountInfo) => (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...values, [field]: event.target.value })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onNext()
  }

  return (
    <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
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
      <Button className="min-h-11" fullWidth size="lg" type="submit" variant="primary">Tiếp tục</Button>
    </form>
  )
}
