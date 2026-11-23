import logoMarkSrc from '@/assets/images/Logo.svg';
import { brand } from '@/lib/brand';
import { cn } from '@/lib/cn';

export type LogoVariant = 'full' | 'mark';
export type LogoSize = 'md' | 'lg';

export interface LogoProps {
  /** `full`: biểu tượng kèm tên và khẩu hiệu. `mark`: chỉ biểu tượng. */
  variant?: LogoVariant;
  size?: LogoSize;
  /** Render light text for dark hero/banner backgrounds. */
  inverted?: boolean;
  className?: string;
}

const sizeClasses: Record<LogoSize, { mark: string; name: string; tagline: string }> = {
  md: { mark: 'h-11', name: 'text-base', tagline: 'text-[9px]' },
  lg: { mark: 'h-14', name: 'text-2xl', tagline: 'text-[11px]' },
};

export function Logo({ variant = 'full', size = 'md', inverted = false, className }: LogoProps) {
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
          <span
            className={cn(
              'font-bold leading-tight tracking-tight',
              inverted ? 'text-white' : 'text-indigo-700',
              sizes.name,
            )}
          >
            {brand.name}
          </span>
          <span
            className={cn(
              'mt-0.5 font-semibold uppercase tracking-[0.2em]',
              inverted ? 'text-white/85' : 'text-slate-600',
              sizes.tagline,
            )}
          >
            {brand.tagline}
          </span>
        </div>
      )}
    </div>
  );
}
