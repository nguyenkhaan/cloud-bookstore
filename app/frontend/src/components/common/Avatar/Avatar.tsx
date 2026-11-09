import React, { useState } from 'react';
import { cn } from '@/lib/cn';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
    name: string;
    imageUrl?: string | null;
    size?: AvatarSize;
    className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm',
};

export function getInitials(name: string): string {
    const initials = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .slice(-2)
        .join('')
        .toUpperCase();
    return initials || '?';
}

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 'md', className }) => {
    // Remember which URL failed so a new URL (e.g. after the session refreshes) gets another try.
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;

    if (showImage) {
        return (
            <img
                alt={name}
                className={cn('shrink-0 rounded-full object-cover ring-2 ring-slate-100', sizeClasses[size], className)}
                onError={() => setFailedUrl(imageUrl ?? null)}
                src={imageUrl ?? undefined}
            />
        );
    }

    return (
        <div
            aria-label={name}
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700 ring-2 ring-indigo-50',
                sizeClasses[size],
                className,
            )}
            role="img"
        >
            {getInitials(name)}
        </div>
    );
};