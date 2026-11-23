import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & {
  value: string
  /** Classes for the dd/mm/yyyy overlay; match the input's horizontal padding and text style. */
  displayClassName?: string
}

function formatIsoDate(value: string) {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : ''
}

/**
 * Native date picker that always displays dd/mm/yyyy, independent of the browser locale.
 */
export function DateInput({ value, className, displayClassName, onClick, ...inputProps }: DateInputProps) {
  const display = formatIsoDate(value)

  return (
    <div className="relative">
      <input
        {...inputProps}
        className={cn(className, 'text-transparent [&::-webkit-datetime-edit]:opacity-0')}
        onClick={(event) => {
          try {
            event.currentTarget.showPicker()
          } catch {
            // showPicker is unsupported or blocked; the native control still works.
          }
          onClick?.(event)
        }}
        type="date"
        value={value}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm',
          display ? 'text-slate-800' : 'text-slate-400',
          displayClassName,
        )}
      >
        {display || 'dd/mm/yyyy'}
      </span>
    </div>
  )
}
