import type { ComponentProps } from 'react'

interface ButtonProps extends ComponentProps<'button'> {
    variant?: 'primary' | 'ghost'
    loading?: boolean
}

const VARIANTS = {
    primary: 'bg-teal-800 text-white hover:bg-teal-900 disabled:bg-teal-800/60',
    ghost: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-400',
}

export function Button({ variant = 'primary', loading = false, disabled, className = '', children, ...props }: ButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            aria-busy={loading}
            className={`inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
        >
            {children}
        </button>
    )
}