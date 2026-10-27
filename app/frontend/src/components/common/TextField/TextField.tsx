import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: string
  hint?: ReactNode
  invalid?: boolean
  className?: string
}

export function TextField({ label, hint, invalid, id, className, ...inputProps }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`
  return (
    <div className={cn(
      'block rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 transition-[border-color,box-shadow] focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15 motion-reduce:transition-none',
      invalid && 'border-rose-600 focus-within:border-rose-600 focus-within:ring-rose-600/15',
      className,
    )}>
      <label className="block text-xs font-semibold text-slate-500" htmlFor={inputId}>{label}</label>
      <input
        {...inputProps}
        aria-describedby={hint ? hintId : undefined}
        aria-invalid={invalid || undefined}
        className="block w-full border-0 bg-transparent pt-1 text-[15px] text-indigo-950 outline-none placeholder:text-slate-400"
        id={inputId}
      />
      {hint && (
        <div className={cn('mt-1.5 flex items-center gap-1.5 text-xs text-slate-500', invalid && 'text-rose-700')} id={hintId}>
          {hint}
        </div>
      )}
    </div>
  )
}
