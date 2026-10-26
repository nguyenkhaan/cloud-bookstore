import React from 'react';

export type StatValueColor = 'default' | 'emerald' | 'amber' | 'rose' | 'indigo';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  valueColor?: StatValueColor;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

const colorClasses: Record<StatValueColor, string> = {
  default: 'text-slate-900',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  indigo: 'text-indigo-600',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  valueColor = 'default',
  description,
  badge,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:shadow-xs ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
        {badge || (icon && <span className="text-slate-400">{icon}</span>)}
      </div>
      <div className={`mt-1 text-xl sm:text-2xl font-bold tracking-tight ${colorClasses[valueColor]}`}>
        {value}
      </div>
      {description && (
        <div className="mt-1 text-[10px] text-slate-400 leading-tight">
          {description}
        </div>
      )}
    </div>
  );
};

