import { useId, useState } from 'react'
import type { InputHTMLAttributes, KeyboardEvent, ReactNode } from 'react'
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
    <div className={`cb-field${invalid ? ' cb-field--invalid' : ''}`}>
      <label className="cb-field__label" htmlFor={inputId}>{label}</label>
      <div className="cb-field__row">
        <input
          {...inputProps}
          aria-describedby={hasHint ? hintId : undefined}
          aria-invalid={invalid || undefined}
          className="cb-field__input"
          id={inputId}
          onBlur={() => setCapsLockOn(false)}
          onKeyDown={trackCapsLock}
          onKeyUp={trackCapsLock}
          type={visible ? 'text' : 'password'}
        />
        <button
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          className="cb-field__toggle"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </div>
      {capsLockOn ? (
        <div className="cb-field__hint cb-field__hint--warn" id={hintId}>
          <CapsLockIcon /> Caps Lock đang bật — kiểm tra trước khi đăng nhập.
        </div>
      ) : (
        hint && <div className="cb-field__hint" id={hintId}>{hint}</div>
      )}
    </div>
  )
}
