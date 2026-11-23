import type { ReactNode } from 'react'
import type { NoticeTone } from '@/features/auth/auth.type'
import { cn } from '@/lib/cn'
import { AlertIcon, CheckIcon, InfoIcon } from './Icons'

const icons = { warning: InfoIcon, error: AlertIcon, success: CheckIcon, info: InfoIcon } as const
const toneClasses: Record<NoticeTone, string> = {
    warning: 'bg-amber-50 text-amber-700',
    error: 'bg-rose-50 text-rose-700',
    success: 'bg-emerald-50 text-emerald-700',
    info: 'bg-indigo-50 text-indigo-800',
}

export function Banner({ tone, children }: { tone: NoticeTone; children: ReactNode }) {
    const ToneIcon = icons[tone]
    return (
        <div className={cn('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-5', toneClasses[tone])} role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}>
            <ToneIcon className="mt-0.5" />
            <div>{children}</div>
        </div>
    )
}
