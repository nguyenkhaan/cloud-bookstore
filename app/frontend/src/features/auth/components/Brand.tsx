import { brand } from '../../../config/brand'
import { BookIcon } from './Icons'

export function Brand({ compact = false }: { compact?: boolean }) {
    return (
        <div className={compact ? 'cb-brand cb-brand--compact' : 'cb-brand'}>
            <BookIcon className="cb-brand__icon" />
            {compact ? (
                <span className="cb-brand__name">{brand.name} <small>{brand.suffix}</small></span>
            ) : (
                <span className="cb-brand__name">{brand.fullName}</span>
            )}
        </div>
    )
}
