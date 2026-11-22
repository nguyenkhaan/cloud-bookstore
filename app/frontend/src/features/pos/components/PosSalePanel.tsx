import { useMemo, useState } from 'react'
import { Trash2, UserRound } from 'lucide-react'
import { Badge, Button, Card } from '@/components/common'
import { copyFixtures, guestCustomer, memberCustomer, saleFixture } from '../pos-transaction.fixture'
import type { PaymentMethod, PaymentStatus, QuickSeriesFixture, SaleLineFixture } from '../pos-transaction.type'
import { formatVnd, sumBy } from '../pos-transaction.utils'
import { PosPaymentPanel } from './PosPaymentPanel'
import { PosScannerField } from './PosScannerField'

interface PosSalePanelProps {
  quickPickerPreview?: QuickSeriesFixture
  onOpenQuickPicker: () => void
}

function getLineTotal(price: number, discountRate: number) {
  return Math.round(price * (1 - discountRate / 100))
}

export function PosSalePanel({ quickPickerPreview, onOpenQuickPicker }: PosSalePanelProps) {
  const [lines, setLines] = useState<SaleLineFixture[]>(saleFixture.lines)
  const [customer, setCustomer] = useState(saleFixture.customer)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(saleFixture.paymentMethod)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(saleFixture.paymentStatus)

  const discountRate = customer?.discountRate ?? 0
  const subtotal = sumBy(lines, (line) => line.actualSellingPrice)
  const total = sumBy(lines, (line) => getLineTotal(line.actualSellingPrice, discountRate))
  const discount = subtotal - total
  const statusMessage = customer ? `Hạng ${customer.tier} · Giảm ${customer.discountRate}% trên giá bán` : 'Khách vãng lai · Không bắt buộc tạo hồ sơ'

  const addCopy = (barcode: string) => {
    const copy = copyFixtures.find((item) => item.copyBarcode === barcode)
    if (!copy) return `Không tìm thấy bản sách ${barcode}.`
    if (lines.some((line) => line.copyBarcode === barcode)) return 'Bản sách đã có trong giỏ hàng.'
    if (copy.status !== 'AVAILABLE' || !['BOTH', 'SALE_ONLY'].includes(copy.availability)) return 'Bản sách không khả dụng cho kênh bán.'
    setLines((current) => [...current, { ...copy, discountRate, lineTotal: getLineTotal(copy.actualSellingPrice, discountRate) }])
    return undefined
  }

  const visibleLines = useMemo(() => lines.map((line) => ({ ...line, lineTotal: getLineTotal(line.actualSellingPrice, discountRate) })), [discountRate, lines])

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
      <div className="space-y-4">
        <Card title="Giỏ hàng tại quầy" action={<Button type="button" size="xs" variant="outline" onClick={onOpenQuickPicker}>Chọn nhanh theo bộ truyện</Button>} bodyClassName="space-y-4">
          <PosScannerField
            label="Quét CopyBarcode bản sách"
            placeholder="Quét mã bản sách hoặc nhập mã…"
            onScan={addCopy}
          />
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-indigo-50/70 text-[10px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-3 font-bold">STT</th><th className="px-3 py-3 font-bold">CopyBarcode / Đầu sách — Tập</th><th className="px-3 py-3 font-bold">Grade</th><th className="px-3 py-3 text-right font-bold">Niêm yết</th><th className="px-3 py-3 text-right font-bold">Giảm</th><th className="px-3 py-3 text-right font-bold">Thành tiền</th><th className="px-2 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleLines.map((line, index) => (
                  <tr key={line.copyBarcode} className="text-slate-600">
                    <td className="px-3 py-3 text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                    <td className="px-3 py-3"><div className="font-semibold text-slate-800">{line.title} · {line.volume}</div><div className="mt-0.5 font-mono text-[10px] text-slate-400">{line.copyBarcode}</div></td>
                    <td className="px-3 py-3"><Badge variant={line.grade === 'A' ? 'success' : 'warning'} size="xs">{line.grade}</Badge></td>
                    <td className="px-3 py-3 text-right">{formatVnd(line.actualSellingPrice)}</td>
                    <td className="px-3 py-3 text-right">{discountRate}%</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-800">{formatVnd(line.lineTotal)}</td>
                    <td className="px-2 py-3"><button type="button" aria-label={`Xóa ${line.title} ${line.volume}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" onClick={() => setLines((current) => current.filter((item) => item.copyBarcode !== line.copyBarcode))}><Trash2 aria-hidden="true" className="size-4" /></button></td>
                  </tr>
                ))}
                {visibleLines.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Chưa có bản sách. Quét CopyBarcode để bắt đầu.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs"><span className="text-slate-500">{lines.length} bản sách · Tổng tiền hàng</span><strong className="text-lg text-slate-900">{formatVnd(subtotal)}</strong></div>
          {quickPickerPreview && <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">Đã chọn nhanh {quickPickerPreview.selectedVolumes.length} tập · Giá dự kiến {formatVnd(quickPickerPreview.selectedVolumes.length * quickPickerPreview.agreedPricePerVolume)}.</div>}
        </Card>
          <Card title="Xem trước hóa đơn" subtitle=""><div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><div className="font-bold text-slate-800">NHÀ SÁCH MÂY</div><div>{lines.length} bản sách · {formatVnd(total)}</div><div>Giảm thành viên · -{formatVnd(discount)}</div><div className="border-t border-slate-200 pt-2 font-semibold text-slate-900">Tạm tính · {formatVnd(total)}</div></div></Card>
      </div>

      <div className="space-y-4">
        <Card title="Khách hàng & Thanh toán" bodyClassName="space-y-4">
          <div className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><UserRound aria-hidden="true" className="size-4" /></span><div><div className="text-sm font-semibold text-slate-900">{customer?.name ?? guestCustomer.name}</div><div className="text-[11px] text-slate-500">{customer?.phone || 'Không bắt buộc số điện thoại'}</div></div></div><Badge variant={customer ? 'brand' : 'neutral'} size="xs">{customer?.tier ?? 'Vãng lai'}</Badge></div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="xs" variant="secondary" onClick={() => setCustomer(customer ? null : memberCustomer)} icon={<UserRound aria-hidden="true" className="size-3.5" />}>{customer ? 'Dùng khách vãng lai' : 'Chọn khách hàng'}</Button><span className="self-center text-[11px] text-slate-500">{statusMessage}</span></div></div>
          <div className="rounded-xl bg-indigo-50/70 p-3 text-xs text-indigo-800"><div className="font-semibold">Tổng thanh toán</div><div className="mt-1 text-2xl font-bold text-indigo-600">{formatVnd(total)}</div>{discount > 0 && <div className="mt-1 text-emerald-700">Đã giảm {formatVnd(discount)} theo hạng thành viên</div>}</div>
          <PosPaymentPanel total={total} method={paymentMethod} status={paymentStatus} cashReceived={saleFixture.cashReceived} onMethodChange={(method) => { setPaymentMethod(method); setPaymentStatus('idle') }} onComplete={() => { setPaymentStatus(paymentMethod === 'vietqr' ? 'pending' : 'success') }} actionLabel="Thanh toán & In hóa đơn" />
        </Card>
      </div>
    </div>
  )
}
