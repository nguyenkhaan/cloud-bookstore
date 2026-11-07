import logoMarkSrc from '@/assets/images/Logo.svg';
import { brand } from '@/lib/brand';
import { cn } from '@/lib/cn';

export type LogoVariant = 'full' | 'mark';
export type LogoSize = 'md' | 'lg';

export interface LogoProps {
  /** `full`: biểu tượng kèm tên và khẩu hiệu. `mark`: chỉ biểu tượng. */
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
}

const sizeClasses: Record<LogoSize, { mark: string; name: string; tagline: string }> = {
  md: { mark: 'h-11', name: 'text-base', tagline: 'text-[9px]' },
  lg: { mark: 'h-20', name: 'text-3xl', tagline: 'text-sm' },
};

export function Logo({ variant = 'full', size = 'md', className }: LogoProps) {
  const sizes = sizeClasses[size];
  const isMark = variant === 'mark';

  return (
    <div className={cn('flex w-fit items-center gap-3 select-none', className)}>
      <img
        src={logoMarkSrc}
        alt={isMark ? brand.name : ''}
        draggable={false}
        className={cn('block w-auto shrink-0', sizes.mark)}
      />
      {!isMark && (
        <div className="flex flex-col text-left">
          <span className={cn('font-bold leading-tight tracking-tight text-indigo-700', sizes.name)}>
            {brand.name}
          </span>
          <span className={cn('mt-1 font-semibold uppercase tracking-[0.2em] text-slate-400', sizes.tagline)}>
            {brand.tagline}
          </span>
        </div>
      )}
    </div>
  );
}
