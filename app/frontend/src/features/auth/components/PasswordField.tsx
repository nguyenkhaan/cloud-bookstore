import { useId, useState } from 'react'
import type { InputHTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { CapsLockIcon, EyeIcon, EyeOffIcon } from './Icons'

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'type' | 'onKeyUp' | 'onKeyDown' | 'onBlur'
> & {
  label: string
  hint?: ReactNode
  invalid?: boolean
  warnCapsLock?: boolean
}

export function PasswordField({ label, hint, invalid, warnCapsLock = false, id, ...inputProps }: PasswordFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`
  const [visible, setVisible] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)

  const trackCapsLock = (event: KeyboardEvent<HTMLInputElement>) => {
    if (warnCapsLock) setCapsLockOn(event.getModifierState('CapsLock'))
  }

  const hasHint = capsLockOn || Boolean(hint)
  return (
    <div className={cn(
      'block rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 transition-[border-color,box-shadow] focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15 motion-reduce:transition-none',
      invalid && 'border-rose-600 focus-within:border-rose-600 focus-within:ring-rose-600/15',
    )}>
      <label className="block text-xs font-semibold text-slate-500" htmlFor={inputId}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          {...inputProps}
          aria-describedby={hasHint ? hintId : undefined}
          aria-invalid={invalid || undefined}
          className="block w-full border-0 bg-transparent pt-1 text-[15px] text-indigo-950 outline-none placeholder:text-slate-400"
          id={inputId}
          onBlur={() => setCapsLockOn(false)}
          onKeyDown={trackCapsLock}
          onKeyUp={trackCapsLock}
          type={visible ? 'text' : 'password'}
        />
        <button
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          className="-mr-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-slate-500 hover:text-indigo-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </div>
      {capsLockOn ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700" id={hintId}>
          <CapsLockIcon /> Caps Lock đang bật — kiểm tra trước khi đăng nhập.
        </div>
      ) : (
        hint && <div className={cn('mt-1.5 flex items-center gap-1.5 text-xs text-slate-500', invalid && 'text-rose-700')} id={hintId}>{hint}</div>
      )}
    </div>
  )
}
