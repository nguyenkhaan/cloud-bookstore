import { useId, type ComponentProps } from 'react'

interface TextFieldProps extends ComponentProps<'input'> {
    label: string
    error?: string
    hint?: string
}

export function TextField({ label, error, hint, className = '', ...props }: TextFieldProps) {
    const id = useId()
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-sm font-medium text-slate-800">
                {label}
            </label>
            <input
                {...props}
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={`block w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-teal-700 ${
                    error ? 'border-red-600' : 'border-slate-300'
                } ${className}`}
            />
            {error ? (
                <p id={`${id}-error`} className="text-sm text-red-700">
                    {error}
                </p>
            ) : hint ? (
                <p id={`${id}-hint`} className="text-sm text-slate-600">
                    {hint}
                </p>
            ) : null}
        </div>
    )
}