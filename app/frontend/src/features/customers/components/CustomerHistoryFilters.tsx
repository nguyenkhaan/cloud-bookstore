import { useId } from 'react'
import { Button } from '@/components/common/Button'
import { SelectBox } from '@/components/common/SelectBox'

export type HistoryFilterValue = { status: string; from: string; to: string }

type CustomerHistoryFiltersProps = {
    value: HistoryFilterValue
    onChange: (next: HistoryFilterValue) => void
    statusOptions: Array<{ value: string; label: string }>
}

const ALL_OPTION = { value: '', label: 'Tất cả' }

const dateWrapperClass =
    'block rounded-xl border border-slate-200 bg-white transition-[border-color,box-shadow] focus-within:border-indigo-600 focus-within:ring-3 focus-within:ring-indigo-600/15 motion-reduce:transition-none'
const dateLabelClass = 'block px-3.5 pt-2.5 text-xs font-semibold text-slate-600'
const dateInputClass =
    'min-h-[44px] w-full bg-transparent px-3.5 pt-1 pb-2.5 text-[15px] text-indigo-950 outline-none'

export function CustomerHistoryFilters({ value, onChange, statusOptions }: CustomerHistoryFiltersProps) {
    const baseId = useId()
    const rangeInvalid = Boolean(value.from && value.to && value.from > value.to)
    const hasFilter = Boolean(value.status || value.from || value.to)
    const errorId = `${baseId}-range-error`
    const hasStatus = statusOptions.length > 0

    return (
        <div className="mb-4" role="group" aria-label="Bộ lọc lịch sử">
            <div
                className={`grid gap-3 sm:items-end ${
                    hasStatus ? 'sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]' : 'sm:grid-cols-[repeat(2,minmax(0,1fr))_auto]'
                }`}
            >
                {hasStatus && (
                    <SelectBox<string>
                        label="Trạng thái"
                        onChange={(status) => onChange({ ...value, status })}
                        options={[ALL_OPTION, ...statusOptions]}
                        searchable={false}
                        value={value.status}
                    />
                )}

                <div className={dateWrapperClass}>
                    <label className={dateLabelClass} htmlFor={`${baseId}-from`}>
                        Từ ngày
                    </label>
                    <input
                        aria-describedby={rangeInvalid ? errorId : undefined}
                        aria-invalid={rangeInvalid}
                        className={dateInputClass}
                        id={`${baseId}-from`}
                        onChange={(event) => onChange({ ...value, from: event.target.value })}
                        type="date"
                        value={value.from}
                    />
                </div>

                <div className={dateWrapperClass}>
                    <label className={dateLabelClass} htmlFor={`${baseId}-to`}>
                        Đến ngày
                    </label>
                    <input
                        aria-describedby={rangeInvalid ? errorId : undefined}
                        aria-invalid={rangeInvalid}
                        className={dateInputClass}
                        id={`${baseId}-to`}
                        onChange={(event) => onChange({ ...value, to: event.target.value })}
                        type="date"
                        value={value.to}
                    />
                </div>

                {hasFilter && (
                    <Button
                        className="min-h-[44px]"
                        onClick={() => onChange({ status: '', from: '', to: '' })}
                        size="sm"
                        type="button"
                        variant="outline"
                    >
                        Xóa bộ lọc
                    </Button>
                )}
            </div>

            {rangeInvalid && (
                <p className="mt-2 text-[11px] font-medium text-rose-700" id={errorId} role="alert">
                    &ldquo;Từ ngày&rdquo; phải trước hoặc bằng &ldquo;Đến ngày&rdquo;.
                </p>
            )}
        </div>
    )
}