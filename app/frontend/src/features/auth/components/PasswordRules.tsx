import { getPasswordChecks } from '@/features/auth/password'
import { cn } from '@/lib/cn'
import { CheckIcon } from './Icons'

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
