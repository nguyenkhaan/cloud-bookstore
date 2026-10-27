import React from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white shadow-2xs hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300',
  secondary: 'bg-white border border-slate-200 text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 disabled:opacity-50',
  outline: 'bg-transparent border border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 disabled:opacity-50',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 active:bg-slate-200/70 disabled:opacity-50',
  danger: 'bg-rose-600 text-white shadow-2xs hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300',
  success: 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-300',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-[11px] rounded-lg gap-1.5',
  sm: 'px-3 py-1.5 text-xs rounded-xl gap-2',
  md: 'px-3.5 py-2 text-xs font-semibold rounded-xl gap-2',
  lg: 'px-4 py-2.5 text-sm font-semibold rounded-xl gap-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      icon,
      iconPosition = 'left',
      fullWidth = false,
      loading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex cursor-pointer select-none items-center justify-center font-medium transition-[background-color,border-color,color,box-shadow,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed motion-reduce:transition-none',
          fullWidth && 'w-full',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

