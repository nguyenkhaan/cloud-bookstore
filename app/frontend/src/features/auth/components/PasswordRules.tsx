import { cn } from '@/lib/cn'
import { CheckIcon } from './Icons'

export const PASSWORD_MAX_LENGTH = 128
const PASSWORD_MIN_LENGTH = 12

type PasswordChecks = {
  length: boolean
  upper: boolean
  digit: boolean
  special: boolean
}

// eslint-disable-next-line react/only-export-components -- unit-tested rule shared by this component and StepPassword
export function getPasswordChecks(password: unknown): PasswordChecks {
  if (typeof password !== 'string') {
    return { length: false, upper: false, digit: false, special: false }
  }

  return {
    length: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
}

// eslint-disable-next-line react/only-export-components -- unit-tested rule shared by this component and StepPassword
export function isPasswordAcceptable(password: unknown): boolean {
  return Object.values(getPasswordChecks(password)).every(Boolean)
}

const rules = [
  ['length', '12–128 ký tự'],
  ['upper', 'Chữ hoa'],
  ['digit', 'Chữ số'],
  ['special', 'Ký tự đặc biệt'],
] as const

export function PasswordRules({ password }: { password: string }) {
  const checks = getPasswordChecks(password)
  return (
    <ul aria-label="Quy tắc mật khẩu" className="flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
      {rules.map(([key, label]) => (
        <li className={cn('flex items-center gap-1 text-xs text-slate-500', checks[key] && 'text-emerald-700')} key={key}>
          {checks[key] ? <CheckIcon className="h-3 w-3" /> : <span aria-hidden="true">•</span>} {label}
        </li>
      ))}
    </ul>
  )
}
