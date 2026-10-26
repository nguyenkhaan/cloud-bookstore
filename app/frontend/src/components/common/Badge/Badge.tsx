import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral' | 'orange';
export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, { container: string; dot: string }> = {
  success: {
    container: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  warning: {
    container: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    dot: 'bg-amber-500',
  },
  danger: {
    container: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    dot: 'bg-rose-500',
  },
  info: {
    container: 'bg-sky-50 text-sky-700 border border-sky-200/80',
    dot: 'bg-sky-500',
  },
  brand: {
    container: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
    dot: 'bg-indigo-600',
  },
  neutral: {
    container: 'bg-slate-50 text-slate-600 border border-slate-200/80',
    dot: 'bg-slate-400',
  },
  orange: {
    container: 'bg-amber-100 text-amber-800 border border-amber-200',
    dot: 'bg-amber-600',
  },
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px] font-bold rounded-full gap-1',
  sm: 'px-2 py-0.5 text-[11px] font-medium rounded-full gap-1.5',
  md: 'px-3 py-1 text-xs font-semibold rounded-full gap-1.5',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  pulse = false,
  icon,
  className = '',
  ...props
}) => {
  const styles = variantClasses[variant];

  return (
    <span
      className={`inline-flex items-center select-none font-medium ${styles.container} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot} ${pulse ? 'animate-pulse' : ''}`}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </span>
  );
};

