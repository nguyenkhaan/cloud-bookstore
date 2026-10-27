import type { ReactNode } from 'react'
import type { NoticeTone } from '@/features/auth/errors'
import { AlertIcon, CheckIcon, InfoIcon } from './Icons'

const icons = { warning: InfoIcon, error: AlertIcon, success: CheckIcon, info: InfoIcon } as const

export function Banner({ tone, children }: { tone: NoticeTone; children: ReactNode }) {
    const ToneIcon = icons[tone]
    return (
        <div className={`cb-banner cb-banner--${tone}`} role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}>
            <ToneIcon />
            <div>{children}</div>
        </div>
    )
}
