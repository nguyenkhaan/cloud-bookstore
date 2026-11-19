import { Badge, Button } from '@/components/common'
import type { PosShiftUiState } from '../pos-shift.type'

type ShiftStatusHeaderProps = {
  state: PosShiftUiState
  openedBy: string
  openedAt: string
  onStateChange: (state: PosShiftUiState) => void
  onPrimaryAction: () => void
  onPrint: () => void
}

const stateLabels: Record<PosShiftUiState, string> = {
  'not-opened': 'Chưa mở',
  open: 'Đang mở',
  closed: 'Đã đóng',
  variance: 'Chênh lệch',
}

const stateVariants = {
  'not-opened': 'neutral',
  open: 'success',
  closed: 'info',
  variance: 'danger',
} as const

export function ShiftStatusHeader({
  state,
  openedBy,
  openedAt,
  onStateChange,
  onPrimaryAction,
  onPrint,
}: ShiftStatusHeaderProps) {
  const primaryLabel = state === 'not-opened' ? 'Mở ca' : state === 'closed' ? 'In biên bản' : 'Đóng ca'

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-slate-900">Trạng thái ca</span>
          <Badge dot variant={stateVariants[state]}>{stateLabels[state]}</Badge>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {state === 'not-opened' ? 'Nhập tiền đầu ca để bắt đầu giao dịch.' : `${openedBy} · Mở lúc ${openedAt}`}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:items-end">
        <div aria-label="Chọn trạng thái mô phỏng" className="flex flex-wrap gap-1" role="group">
          {(Object.keys(stateLabels) as PosShiftUiState[]).map((option) => (
            <button
              aria-pressed={state === option}
              className={`min-h-11 rounded-lg px-3 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
                state === option ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              key={option}
              onClick={() => onStateChange(option)}
              type="button"
            >
              {stateLabels[option]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onPrint} size="sm" variant="secondary">In biên bản</Button>
          <Button disabled={state === 'closed' && primaryLabel === 'In biên bản'} onClick={onPrimaryAction} size="sm">
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
