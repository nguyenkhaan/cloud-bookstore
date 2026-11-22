import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, CircleAlert, ScanLine } from 'lucide-react'
import { Badge, Button, Card } from '@/components/common'
import { returnFixture } from '../pos-transaction.fixture'
import type { PaymentMethod, PaymentStatus, ReturnLineFixture } from '../pos-transaction.type'
import { formatVnd, sumBy } from '../pos-transaction.utils'
import { PosScannerField } from './PosScannerField'

interface PosReturnPanelProps {
  onOpenDamageReview: (line: ReturnLineFixture) => void
  damageApprovalStatus?: string
}

export function PosReturnPanel({ onOpenDamageReview, damageApprovalStatus }: PosReturnPanelProps) {
  const [lines, setLines] = useState<ReturnLineFixture[]>(returnFixture.lines)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle')
  const [showInsufficient] = useState(returnFixture.insufficientDeposit)
  const scannedCount = lines.filter((line) => line.returnStatus === 'scanned' || line.returnStatus === 'damage').length
  const deduction = sumBy(lines, (line) => line.depositDeduction + line.lateFee)
  const effectiveDeposit = showInsufficient ? 100000 : returnFixture.originalDeposit
  const balance = effectiveDeposit - deduction
  const canSettle = scannedCount === lines.length && !showInsufficient
  const statusLabel = showInsufficient ? 'Chờ thanh toán bổ sung' : balance >= 0 ? 'Hoàn cọc cho khách' : 'Khách cần trả thêm'
  const statusVariant = showInsufficient ? 'warning' : balance >= 0 ? 'success' : 'danger'
  const selectedDamage = useMemo(() => lines.find((line) => line.returnStatus === 'damage'), [lines])

  const scanCopy = (barcode: string) => {
    const line = lines.find((item) => item.copyBarcode === barcode)
    if (!line) return 'CopyBarcode không thuộc phiếu thuê này.'
    if (line.returnStatus === 'scanned' || line.returnStatus === 'damage') return 'Bản sách đã được ghi nhận trong phiếu trả.'
    setLines((current) => current.map((item) => item.copyBarcode === barcode ? { ...item, returnStatus: 'scanned' } : item))
    return undefined
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <div className="space-y-4">
        <Card title="Kiểm định toàn bộ phiếu" subtitle={`${returnFixture.reference} · ${returnFixture.customer.name}`} bodyClassName="space-y-4">
          <PosScannerField label="Quét CopyBarcode từng cuốn trả" placeholder="Quét mã cuốn trả…" onScan={scanCopy} />
          <div className="flex items-center justify-between gap-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700"><span className="inline-flex items-center gap-1.5"><ScanLine aria-hidden="true" className="size-4" />Đã kiểm định {scannedCount}/{lines.length} bản</span><strong>{Math.round((scannedCount / Math.max(lines.length, 1)) * 100)}%</strong></div>
          <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-xs"><thead className="bg-indigo-50/70 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Barcode / Tên sách</th><th className="px-3 py-3 text-right">Cọc từng cuốn</th><th className="px-3 py-3">Xác nhận</th><th className="px-3 py-3">Tình trạng thực tế</th><th className="px-3 py-3 text-right">Khấu trừ</th></tr></thead><tbody className="divide-y divide-slate-100">{lines.map((line) => <tr key={line.copyBarcode}><td className="px-3 py-3"><div className="font-semibold text-slate-800">{line.copyBarcode} · {line.title} · {line.volume}</div><div className="text-[10px] text-slate-400">Giá bán thực tế {formatVnd(line.actualSellingPrice)}</div></td><td className="px-3 py-3 text-right">{formatVnd(line.actualSellingPrice)}</td><td className="px-3 py-3"><Badge variant={line.returnStatus === 'waiting' ? 'warning' : line.returnStatus === 'damage' ? 'danger' : 'success'} size="xs" dot>{line.returnStatus === 'waiting' ? 'Chờ quét' : line.returnStatus === 'damage' ? 'Đã khai báo' : 'Đã quét'}</Badge></td><td className="px-3 py-3 text-slate-600">{line.returnStatus === 'damage' ? 'Hư hỏng · chờ duyệt' : line.lateFee ? `Quá hạn · ${formatVnd(line.lateFee)}` : 'Nguyên vẹn'}</td><td className="px-3 py-3 text-right font-semibold text-rose-600">{line.depositDeduction || line.lateFee ? formatVnd(line.depositDeduction + line.lateFee) : '0đ'}</td></tr>)}</tbody></table></div>
          <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" disabled={!selectedDamage} onClick={() => selectedDamage && onOpenDamageReview(selectedDamage)} icon={<CircleAlert aria-hidden="true" className="size-4" />}>Thẩm định hư hỏng ngoại lệ</Button><Button type="button" size="sm" variant="secondary" onClick={() => setLines((current) => current.map((line, index) => index === current.length - 1 ? { ...line, returnStatus: 'missing' } : line))} icon={<AlertTriangle aria-hidden="true" className="size-4" />}>Đánh dấu mất cuốn cuối</Button></div>
          {damageApprovalStatus && <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">Trạng thái thẩm định: <strong>{damageApprovalStatus}</strong></div>}
        </Card>
        <Card title="Căn cứ khấu trừ"><div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-2 py-2">Khoản mục</th><th className="px-2 py-2">Cách tính</th><th className="px-2 py-2 text-right">Số tiền</th></tr></thead><tbody className="divide-y divide-slate-100"><tr><td className="px-2 py-3 font-semibold">B · Thực thuê</td><td className="px-2 py-3 text-slate-500">Theo thời gian thực tế</td><td className="px-2 py-3 text-right">31.500đ</td></tr><tr><td className="px-2 py-3 font-semibold">C · Gia hạn đã chốt</td><td className="px-2 py-3 text-slate-500">Theo lịch sử phiếu</td><td className="px-2 py-3 text-right">13.500đ</td></tr><tr><td className="px-2 py-3 font-semibold">D · Phạt trả trễ</td><td className="px-2 py-3 text-slate-500">Theo hạn trả</td><td className="px-2 py-3 text-right text-rose-600">7.500đ</td></tr><tr><td className="px-2 py-3 font-semibold">F · Hư hỏng ngoại lệ</td><td className="px-2 py-3 text-slate-500">Chờ Admin duyệt</td><td className="px-2 py-3 text-right text-rose-600">120.000đ</td></tr></tbody></table></div></Card>
      </div>
      <div className="space-y-4">
        <Card title="Quyết toán tiền cọc" bodyClassName="space-y-4">
          <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-800"><div className="flex justify-between gap-3"><span>A · Tiền cọc ban đầu</span><strong>{formatVnd(effectiveDeposit)}</strong></div><div className="mt-2 flex justify-between gap-3"><span>B–F · Khoản khấu trừ</span><strong className="text-rose-600">- {formatVnd(deduction)}</strong></div><div className="mt-3 border-t border-indigo-100 pt-3"><div className="text-[10px] uppercase tracking-wider">{statusLabel}</div><div className={`mt-1 text-2xl font-bold ${balance >= 0 && !showInsufficient ? 'text-emerald-600' : 'text-rose-600'}`}>{formatVnd(Math.abs(balance))}</div></div></div>
          <Badge variant={statusVariant} dot>{showInsufficient ? 'Thiếu cọc · cần thu bổ sung' : balance >= 0 ? 'Hoàn tiền mặt ngoài hệ thống' : 'Cần thu thêm trước khi đóng phiếu'}</Badge>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-indigo-50 p-1"><button type="button" className={`min-h-11 rounded-lg text-xs font-semibold ${paymentMethod === 'cash' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'}`} onClick={() => setPaymentMethod('cash')}>Tiền mặt</button><button type="button" className={`min-h-11 rounded-lg text-xs font-semibold ${paymentMethod === 'vietqr' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'}`} onClick={() => setPaymentMethod('vietqr')}>Chuyển khoản ngoài</button></div>
          {showInsufficient && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertTriangle aria-hidden="true" className="mr-1 inline size-4" />Cọc không đủ. Chưa được hoàn tất quyết toán.</div>}
          <Button type="button" fullWidth disabled={!canSettle} variant={balance >= 0 ? 'primary' : 'danger'} onClick={() => setPaymentStatus(paymentMethod === 'vietqr' ? 'pending' : 'success')} icon={<CheckCircle2 aria-hidden="true" className="size-4" />}>{balance >= 0 ? 'Xác nhận trả & Hoàn cọc' : 'Xác nhận thu bổ sung'}</Button>
          {paymentStatus === 'pending' && <div className="text-center text-xs text-indigo-600">Đang chờ đối soát chuyển khoản ngoài</div>}
          {paymentStatus === 'success' && <div className="text-center text-xs text-emerald-600">Quyết toán đã hoàn tất.</div>}
        </Card>
      </div>
    </div>
  )
}
