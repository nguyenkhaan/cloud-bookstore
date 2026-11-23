import { useId, useState } from 'react'
import type { InputHTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { CapsLockIcon, EyeIcon, EyeOffIcon } from './Icons'

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'type' | 'onKeyUp' | 'onKeyDown' | 'onBlur'
> & {
  label?: string
  hint?: ReactNode
  invalid?: boolean
  valid?: boolean
  variant?: 'underline' | 'outlined'
  warnCapsLock?: boolean
  className?: string
}

export function PasswordField({
  label,
  hint,
  invalid,
  valid = false,
  variant = 'underline',
  warnCapsLock = false,
  id,
  className,
  ...inputProps
}: PasswordFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`
  const [visible, setVisible] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)

  const trackCapsLock = (event: KeyboardEvent<HTMLInputElement>) => {
    if (warnCapsLock) setCapsLockOn(event.getModifierState('CapsLock'))
  }

  const isOutlined = variant === 'outlined'
  const showValid = isOutlined && valid && !invalid
  const hasHint = capsLockOn || Boolean(hint)

  return (
    <div className={cn('block', className)}>
      {label && (
        <label
          className={cn(
            'block font-semibold',
            isOutlined ? 'mb-1.5 text-[13px] text-slate-700' : 'text-xs text-slate-500',
          )}
          htmlFor={inputId}
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          isOutlined
            ? cn(
                'flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white pl-3.5 pr-1 py-1 transition-[border-color,box-shadow] focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15 motion-reduce:transition-none',
                showValid && 'border-emerald-500 focus-within:border-emerald-600 focus-within:ring-emerald-500/15',
                invalid && 'border-rose-500 focus-within:border-rose-600 focus-within:ring-rose-500/15',
              )
            : cn(
                'flex items-center gap-2 border-b border-slate-300 pt-1 pb-2 transition-[border-color,box-shadow] focus-within:border-indigo-600 focus-within:shadow-[0_1px_0_0_var(--color-indigo-600)] motion-reduce:transition-none',
                invalid && 'border-rose-600 focus-within:border-rose-600 focus-within:shadow-[0_1px_0_0_var(--color-rose-600)]',
              ),
        )}
      >
        <input
          {...inputProps}
          aria-describedby={hasHint ? hintId : undefined}
          aria-invalid={invalid || undefined}
          className={cn(
            'block min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:text-slate-400',
            isOutlined ? 'py-1.5 text-slate-900' : 'text-indigo-950',
          )}
          id={inputId}
          onBlur={() => setCapsLockOn(false)}
          onKeyDown={trackCapsLock}
          onKeyUp={trackCapsLock}
          type={visible ? 'text' : 'password'}
        />
        {showValid && (
          <Check aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
        )}
        <button
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          className={cn(
            'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-slate-500 hover:text-indigo-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
            !isOutlined && '-my-3 -mr-2',
          )}
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </div>
      {capsLockOn ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700" id={hintId}>
          <CapsLockIcon /> Caps Lock đang bật - kiểm tra trước khi đăng nhập.
        </div>
      ) : (
        hint && (
          <div className={cn('mt-1.5 flex items-center gap-1.5 text-xs text-slate-500', invalid && 'text-rose-700')} id={hintId}>
            {hint}
          </div>
        )
      )}
    </div>
  )
}
