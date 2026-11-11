import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { ChevronRightIcon } from '../Icons';

export interface BreadcrumbItem {
    label: string;
    /** Route this crumb navigates to. Ignored on the last crumb, which is the current page. */
    to?: string;
}

export interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}

const linkClasses =
    'block truncate rounded px-1 py-1.5 text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40';

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
    if (items.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className={cn('flex', className)}>
            <ol className="flex min-w-0 items-center gap-1.5">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <li
                            key={`${index}-${item.label}`}
                            className={cn('flex min-w-0 items-center gap-1.5', !isLast && 'max-w-48')}
                        >
                            {index > 0 && (
                                <ChevronRightIcon aria-hidden="true" className="shrink-0 text-slate-400" size={12} />
                            )}
                            {isLast ? (
                                <span
                                    aria-current="page"
                                    className="truncate px-1 py-1.5 font-semibold text-slate-900"
                                    title={item.label}
                                >
                  {item.label}
                </span>
                            ) : item.to ? (
                                <Link className={linkClasses} title={item.label} to={item.to}>
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="truncate px-1 py-1.5 text-slate-600" title={item.label}>
                  {item.label}
                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};