import { cn } from '@/lib/cn'
import { getPasswordChecks } from './PasswordRules'

export type PasswordStrengthResult = {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  tone: 'neutral' | 'danger' | 'warning' | 'info' | 'success'
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { score: 0, label: '', tone: 'neutral' }
  }

  const checks = getPasswordChecks(password)
  const metCount = Number(checks.length) + Number(checks.upper) + Number(checks.digit) + Number(checks.special)

  if (metCount === 4) {
    return {
      score: 4,
      label: password.length >= 16 ? 'Rất mạnh' : 'Mạnh',
      tone: 'success',
    }
  }

  if (metCount === 3) {
    return { score: 3, label: 'Khá', tone: 'info' }
  }

  if (metCount === 2) {
    return { score: 2, label: 'Trung bình', tone: 'warning' }
  }

  return { score: 1, label: 'Yếu', tone: 'danger' }
}

const barActiveTone: Record<PasswordStrengthResult['tone'], string> = {
  neutral: 'bg-slate-200',
  danger: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-indigo-500',
  success: 'bg-emerald-500',
}

const textTone: Record<PasswordStrengthResult['tone'], string> = {
  neutral: 'text-slate-500',
  danger: 'text-rose-600',
  warning: 'text-amber-700',
  info: 'text-indigo-700',
  success: 'text-emerald-700',
}

const inlineDetails: Record<PasswordStrengthResult['tone'], string> = {
  neutral: '',
  danger: 'Chưa đạt yêu cầu bảo mật',
  warning: 'Cần bổ sung đủ tiêu chí bảo mật',
  info: 'Gần đạt đủ yêu cầu bảo mật',
  success: 'Đáp ứng đầy đủ yêu cầu bảo mật',
}

type PasswordStrengthBarProps = {
  password: string
  variant?: 'inline' | 'split'
  className?: string
}

export function PasswordStrengthBar({
  password,
  variant = 'inline',
  className,
}: PasswordStrengthBarProps) {
  const result = evaluatePasswordStrength(password)
  const segments = [1, 2, 3, 4] as const

  return (
    <div className={cn('space-y-1.5', className)}>
      <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
        {segments.map((segment) => (
          <span
            className={cn(
              'h-1.5 rounded-full transition-colors motion-reduce:transition-none',
              result.score >= segment ? barActiveTone[result.tone] : 'bg-slate-200',
            )}
            key={segment}
          />
        ))}
      </div>
      {result.score > 0 && (
        variant === 'split' ? (
          <div className="flex items-center justify-between text-xs" role="status">
            <span className="text-slate-500">Độ mạnh mật khẩu:</span>
            <span className={cn('font-semibold', textTone[result.tone])}>{result.label}</span>
          </div>
        ) : (
          <p className={cn('text-xs font-medium', textTone[result.tone])} role="status">
            {result.label} · {inlineDetails[result.tone]}
          </p>
        )
      )}
    </div>
  )
}
