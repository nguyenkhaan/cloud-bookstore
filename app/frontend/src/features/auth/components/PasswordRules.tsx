import { getPasswordChecks } from '@/tmp/auth/password'

const rules = [
  ['length', '12–128 ký tự'],
  ['upper', 'Chữ hoa'],
  ['digit', 'Chữ số'],
  ['special', 'Ký tự đặc biệt'],
] as const

export function PasswordRules({ password }: { password: string }) {
  const checks = getPasswordChecks(password)
  return (
    <ul aria-label="Quy tắc mật khẩu" className="cb-rules">
      {rules.map(([key, label]) => (
        <li className={checks[key] ? 'cb-rule cb-rule--ok' : 'cb-rule'} key={key}>
          {checks[key] ? '✓' : '•'} {label}
        </li>
      ))}
    </ul>
  )
}
