import { useState } from 'react'
import { AlertTriangle, CalendarDays } from 'lucide-react'
import { Badge, Card, TextField } from '@/components/common'
import { copyFixtures, rentalFixture } from '../pos-transaction.fixture'
import type { PaymentMethod, PaymentStatus, RentalLineFixture } from '../pos-transaction.type'
import { formatVnd, sumBy } from '../pos-transaction.utils'
import { PosPaymentPanel } from './PosPaymentPanel'
import { PosScannerField } from './PosScannerField'

export function PosRentalPanel() {
  const [lines, setLines] = useState<RentalLineFixture[]>(rentalFixture.lines)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(rentalFixture.paymentMethod)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(rentalFixture.paymentStatus)
  const totalDeposit = sumBy(lines, (line) => line.deposit)
  const rentalFeePreview = sumBy(lines, (line) => line.rentalFeePreview)
  const rentalWarning = lines.length > 5
    ? 'Vượt hạn mức 5 cuốn cho hạng thành viên hiện tại.'
    : totalDeposit > 1_000_000
      ? 'Tổng tiền cọc vượt 1.000.000đ, cần Admin xác nhận trước khi lập phiếu.'
      : undefined

  const addCopy = (barcode: string) => {
    const copy = copyFixtures.find((item) => item.copyBarcode === barcode)
    if (!copy) return `Không tìm thấy bản sách ${barcode}.`
    if (lines.some((line) => line.copyBarcode === barcode)) return 'Bản sách đã có trong phiếu thuê.'
    if (copy.status !== 'AVAILABLE' || !['BOTH', 'RENTAL_ONLY'].includes(copy.availability)) return 'Bản sách không khả dụng cho kênh thuê.'
    setLines((current) => [...current, { ...copy, rentalDays: rentalFixture.rentalDays, rentalFeePreview: copy.rentalRatePerDay * rentalFixture.rentalDays, deposit: copy.actualSellingPrice }])
    return undefined
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <div className="space-y-4">
        <Card title="Bản sách khách chọn" subtitle="Quét CopyBarcode từng bản sách khả dụng cho thuê" bodyClassName="space-y-4">
          <PosScannerField label="Quét CopyBarcode bản sách" placeholder="Quét mã bản sách hoặc nhập mã…" onScan={addCopy} />
          <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-xs"><thead className="bg-indigo-50/70 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Bản sách / Barcode</th><th className="px-3 py-3">Grade</th><th className="px-3 py-3 text-right">Cọc theo giá bán</th><th className="px-3 py-3 text-right">Thuê / ngày</th><th className="px-3 py-3 text-right">Phí thuê dự kiến</th></tr></thead><tbody className="divide-y divide-slate-100">{lines.map((line) => <tr key={line.copyBarcode}><td className="px-3 py-3"><div className="font-semibold text-slate-800">{line.title} · {line.volume}</div><div className="font-mono text-[10px] text-slate-400">{line.copyBarcode}</div></td><td className="px-3 py-3"><Badge variant={line.grade === 'A' ? 'success' : 'warning'} size="xs">{line.grade}</Badge></td><td className="px-3 py-3 text-right font-semibold text-slate-800">{formatVnd(line.deposit)}</td><td className="px-3 py-3 text-right text-slate-600">{formatVnd(line.rentalRatePerDay)}</td><td className="px-3 py-3 text-right text-slate-600">{formatVnd(line.rentalFeePreview)}</td></tr>)}</tbody></table></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs"><span className="text-slate-500">{lines.length} bản sách · Tổng giá bán thực tế</span><strong className="text-lg text-slate-900">{formatVnd(totalDeposit)}</strong></div>
        </Card>
        <Card title="Thời hạn thuê & Điều kiện · Hạng Bạc" subtitle="Phí thuê chỉ quyết toán khi trả sách" bodyClassName="space-y-4">
          <div className="grid gap-3 md:grid-cols-3"><TextField label="Ngày bắt đầu" value="18/10/2026" readOnly variant="outlined" /><TextField label="Số ngày thuê" value="7 ngày · Tối đa 24 ngày" readOnly variant="outlined" /><TextField label="Hạn trả dự kiến" value="24/10/2026 · 23:59" readOnly variant="outlined" /></div>
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700"><CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0" />Hạng Bạc: tối đa 5 cuốn, 21 ngày và được áp dụng mức phí thuê theo hạng thành viên.</div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card title="Thông tin khách thuê" subtitle="Cập nhật đầy đủ thông tin khách thuê" bodyClassName="space-y-3">
          <TextField label="Số điện thoại" value={rentalFixture.customer.phone} readOnly variant="outlined" />
          <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-slate-900">{rentalFixture.customer.name}</div><div className="text-xs text-slate-500">CCCD {rentalFixture.customer.identityNumber}</div></div><Badge variant="brand">Hạng {rentalFixture.customer.tier}</Badge></div>
          <TextField label="Địa chỉ thường trú" value={rentalFixture.customer.address} readOnly variant="outlined" />
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle aria-hidden="true" className="mr-1 inline size-4" />Vui lòng kiểm tra CCCD và địa chỉ trước khi xác nhận phiếu thuê.</div>
        </Card>
        <PosPaymentPanel total={totalDeposit} method={paymentMethod} status={paymentStatus} disabled={Boolean(rentalWarning)} disabledReason={rentalWarning} onMethodChange={(method) => { setPaymentMethod(method); setPaymentStatus('idle') }} onComplete={() => { setPaymentStatus(paymentMethod === 'vietqr' ? 'pending' : 'success') }} title="Thu tiền cọc · Hạng Bạc" subtitle={`Phí thuê dự kiến khi trả: ${formatVnd(rentalFeePreview)}`} actionLabel={paymentMethod === 'vietqr' ? 'In phiếu thuê' : 'Xác nhận & In phiếu thuê'} />
      </div>
    </div>
  )
}
