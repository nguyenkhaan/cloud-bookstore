import React from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: CardPadding;
  headerClassName?: string;
  bodyClassName?: string;
}

const paddingClasses: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  badge,
  footer,
  padding = 'md',
  headerClassName = '',
  bodyClassName = '',
  className = '',
  ...props
}) => {
  const hasHeader = Boolean(title || subtitle || action || badge);

  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-shadow ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {hasHeader && (
        <div className={`flex items-start justify-between gap-4 mb-4 ${headerClassName}`}>
          <div>
            <div className="flex items-center gap-2">
              {title && (
                typeof title === 'string' ? (
                  <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                ) : (
                  title
                )
              )}
              {badge}
            </div>
            {subtitle && (
              typeof subtitle === 'string' ? (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              ) : (
                subtitle
              )
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {children && <div className={bodyClassName}>{children}</div>}

      {footer && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};

