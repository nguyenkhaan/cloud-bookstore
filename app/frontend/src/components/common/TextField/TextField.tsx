import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label?: string
  hint?: ReactNode
  invalid?: boolean
  variant?: 'underline' | 'outlined'
  suffix?: ReactNode
  className?: string
}

export function TextField({
  label,
  hint,
  invalid,
  variant = 'underline',
  suffix,
  id,
  className,
  readOnly,
  disabled,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`
  const isOutlined = variant === 'outlined'
  const isLocked = Boolean(readOnly || disabled)

  return (
    <div className={cn('block', className)}>
      {label && (
        <label
          className={cn(
            'block font-semibold',
            isOutlined ? 'mb-1.5 text-[13px] text-slate-700' : 'text-xs text-slate-600',
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
                'flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 transition-[border-color,box-shadow] focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15 motion-reduce:transition-none',
                isLocked && 'bg-slate-50 border-slate-200/90 focus-within:border-slate-300 focus-within:ring-0',
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
          aria-describedby={hint ? hintId : undefined}
          aria-invalid={invalid || undefined}
          className={cn(
            'block min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:text-slate-400',
            isOutlined
              ? isLocked
                ? 'text-slate-500'
                : 'text-slate-900'
              : 'text-indigo-950 placeholder:text-slate-500',
          )}
          disabled={disabled}
          id={inputId}
          readOnly={readOnly}
        />
        {suffix && <div className="shrink-0">{suffix}</div>}
      </div>
      {hint && (
        <div
          className={cn('mt-1.5 flex items-center gap-1.5 text-xs text-slate-500', invalid && 'text-rose-700')}
          id={hintId}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
