import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: string
  hint?: ReactNode
  invalid?: boolean
}

export function TextField({ label, hint, invalid, id, ...inputProps }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`
  return (
    <div className={`cb-field${invalid ? ' cb-field--invalid' : ''}`}>
      <label className="cb-field__label" htmlFor={inputId}>{label}</label>
      <input
        {...inputProps}
        aria-describedby={hint ? hintId : undefined}
        aria-invalid={invalid || undefined}
        className="cb-field__input"
        id={inputId}
      />
      {hint && <div className="cb-field__hint" id={hintId}>{hint}</div>}
    </div>
  )
}
