import { useEffect } from 'react'
import { CheckCircle2, Clock3, QrCode } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import type { CustomerDisplayFixture } from '../pos-transaction.type'
import { formatVnd } from '../pos-transaction.utils'

interface PosCustomerDisplayProps {
  fixture: CustomerDisplayFixture
  onPaymentSuccess: () => void
}

export function PosCustomerDisplay({ fixture, onPaymentSuccess }: PosCustomerDisplayProps) {
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined
    const channel = new BroadcastChannel('cloud-bookstore-pos-display')
    channel.onmessage = (event: MessageEvent<{ type?: string; status?: CustomerDisplayFixture['paymentStatus'] }>) => {
      if (event.data?.type === 'POS_DISPLAY_SUCCESS' && event.data.status === 'success') onPaymentSuccess()
    }
    return () => channel.close()
  }, [onPaymentSuccess])

  const isSuccess = fixture.paymentStatus === 'success'

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-800 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4"><Logo size="md" /><div className="text-right text-[11px] text-slate-500"><div className="font-semibold text-indigo-700">Quầy 01 · {fixture.requestCode}</div><div>Màn hình khách hàng</div></div></header>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
          <section className="rounded-3xl bg-white p-6 shadow-2xs sm:p-8" aria-labelledby="customer-order-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 id="customer-order-title" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Những cuốn sách bạn chọn</h1><p className="mt-2 text-sm text-slate-500">{fixture.lines.length} cuốn sách · Hạng {fixture.customerTier} · Ưu đãi 5% giá bán</p></div></div><div className="mt-8 divide-y divide-slate-100">{fixture.lines.map((line) => <div key={`${line.title}-${line.volume}`} className="flex items-center justify-between gap-4 py-5 first:pt-0"><div className="flex min-w-0 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white">{line.title.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-800">{line.title} · {line.volume}</div><div className="mt-1 text-[11px] text-slate-400">Số lượng {line.quantity} · Sách đã chọn</div></div></div><strong className="shrink-0 text-sm text-slate-900">{formatVnd(line.lineTotal)}</strong></div>)}</div><dl className="mt-4 space-y-3 border-t border-slate-100 pt-5 text-xs"><div className="flex justify-between gap-3 text-slate-500"><dt>Tổng tiền hàng</dt><dd className="font-semibold text-slate-800">{formatVnd(fixture.subtotal)}</dd></div><div className="flex justify-between gap-3 text-slate-500"><dt>Ưu đãi thành viên</dt><dd className="font-semibold text-emerald-600">- {formatVnd(fixture.discount)}</dd></div><div className="flex justify-between gap-3 pt-3 text-slate-800"><dt className="font-semibold">Tổng thanh toán</dt><dd className="text-2xl font-bold text-indigo-600">{formatVnd(fixture.total)}</dd></div></dl></section>
          <section className="rounded-3xl bg-white p-6 shadow-2xs sm:p-8" aria-labelledby="customer-payment-title"><div className="text-center"><h2 id="customer-payment-title" className="text-lg font-bold text-slate-900">Quét mã để thanh toán</h2><div className="mt-4 text-3xl font-bold text-indigo-600">{formatVnd(fixture.total)}</div><div className="mx-auto mt-5 flex aspect-square max-w-56 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"><div className="flex size-44 flex-col items-center justify-center gap-2 border-8 border-slate-900 bg-white text-slate-900"><QrCode aria-hidden="true" className="size-24" /><span className="font-mono text-[9px]">{fixture.paymentReference}</span></div></div><div className="mt-4 text-[11px] font-semibold text-slate-500">{fixture.bankLabel}</div><div className="mt-2 text-xs text-slate-500">Nội dung: {fixture.paymentReference}</div><BadgeStatus isSuccess={isSuccess} expiresAt={fixture.expiresAt} /></div></section>
        </div>
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm ${isSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`} role="status"><span className="inline-flex items-center gap-2 font-semibold">{isSuccess ? <CheckCircle2 aria-hidden="true" className="size-5" /> : <Clock3 aria-hidden="true" className="size-5" />}{isSuccess ? 'Trạng thái sau thanh toán: Thanh toán thành công! Cảm ơn quý khách.' : 'Trạng thái thanh toán: Đang chờ thanh toán…'}</span><span className="text-xs">Mã yêu cầu hết hạn sau {fixture.expiresAt}</span></div>
      </div>
    </main>
  )
}

function BadgeStatus({ isSuccess, expiresAt }: { isSuccess: boolean; expiresAt: string }) {
  return <div className={`mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${isSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><span className={`size-1.5 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-amber-500'}`} />{isSuccess ? 'Thanh toán thành công' : `Hiệu lực đến ${expiresAt}`}</div>
}
