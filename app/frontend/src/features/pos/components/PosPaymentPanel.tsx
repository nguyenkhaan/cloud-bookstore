import { CheckCircle2, Clock3, CreditCard, QrCode, WalletCards } from 'lucide-react'
import { Badge, Button, Card } from '@/components/common'
import type { PaymentMethod, PaymentStatus } from '../pos-transaction.type'
import { formatVnd, paymentStatusLabel } from '../pos-transaction.utils'

interface PosPaymentPanelProps {
  total: number
  method: PaymentMethod
  status: PaymentStatus
  cashReceived?: number
  title?: string
  subtitle?: string
  actionLabel?: string
  disabled?: boolean
  disabledReason?: string
  onMethodChange: (method: PaymentMethod) => void
  onComplete: () => void
}

export function PosPaymentPanel({ total, method, status, cashReceived = 0, title = 'Thanh toán', subtitle, actionLabel = 'Xác nhận thanh toán', disabled = false, disabledReason, onMethodChange, onComplete }: PosPaymentPanelProps) {
  const change = Math.max(0, cashReceived - total)
  const isSuccess = status === 'success'

  return (
    <Card title={title} subtitle={subtitle} className="h-fit" bodyClassName="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-indigo-50 p-1" role="radiogroup" aria-label="Phương thức thanh toán">
        {(['cash', 'vietqr'] as const).map((option) => {
          const active = method === option
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${active ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => onMethodChange(option)}
            >
              {option === 'cash' ? <WalletCards aria-hidden="true" className="size-4" /> : <CreditCard aria-hidden="true" className="size-4" />}
              {option === 'cash' ? 'Tiền mặt' : 'VietQR'}
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl bg-indigo-50 px-4 py-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Tổng cần thanh toán</div>
        <div className="mt-1 text-2xl font-bold tracking-tight text-indigo-600">{formatVnd(total)}</div>
      </div>

      {method === 'cash' ? (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3 text-slate-500"><span>Tiền khách đưa</span><strong className="text-slate-800">{formatVnd(cashReceived)}</strong></div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-slate-500"><span>Tiền thối lại</span><strong className="text-emerald-600">{formatVnd(change)}</strong></div>
        </div>
      ) : (
        <div className="flex justify-center py-2">
          <div aria-label="Mã QR thanh toán" className="flex size-48 items-center justify-center bg-white text-slate-950" role="img">
            <QrCode aria-hidden="true" className="size-full" strokeWidth={1.8} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Badge variant={isSuccess ? 'success' : status === 'pending' ? 'info' : status === 'error' ? 'danger' : 'neutral'} dot>
          {paymentStatusLabel[status]}
        </Badge>
        {status !== 'pending' && !isSuccess && (
          <Button type="button" size="sm" disabled={disabled} onClick={onComplete} icon={<CheckCircle2 aria-hidden="true" className="size-4" />}>
            {actionLabel}
          </Button>
        )}
        {status === 'pending' && <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600"><Clock3 aria-hidden="true" className="size-3.5" /> Đang chờ</span>}
      </div>
      {disabled && disabledReason && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" role="alert">{disabledReason}</div>}
    </Card>
  )
}
