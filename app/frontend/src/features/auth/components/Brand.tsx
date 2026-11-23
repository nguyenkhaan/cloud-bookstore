import { brand } from '@/lib/brand'
import { cn } from '@/lib/cn'
import { BookIcon } from './Icons'

export function Brand({ compact = false }: { compact?: boolean }) {
    return (
        <div className="flex items-center gap-2.5 text-indigo-950">
            <BookIcon className={cn('h-[30px] w-[30px] text-indigo-600', compact && 'h-[22px] w-[22px]')} />
          
                <span className="text-2xl font-bold tracking-tight">{brand.name}</span>
            
        </div>
    )
}
