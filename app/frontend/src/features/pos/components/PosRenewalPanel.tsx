import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, History } from 'lucide-react'
import { Badge, Button, Card, SelectBox, TextField } from '@/components/common'
import { renewalFixture } from '../pos-transaction.fixture'
import { formatVnd } from '../pos-transaction.utils'
import { PosScannerField } from './PosScannerField'

export function PosRenewalPanel() {
  type RenewalDay = '3' | '7'
  const [requestedDays, setRequestedDays] = useState(renewalFixture.requestedDays)
  const [status, setStatus] = useState(renewalFixture.status)
  const [isCalculated, setIsCalculated] = useState(false)
  const canRenew = status === 'active' && renewalFixture.renewalCount < renewalFixture.maxRenewals && requestedDays <= renewalFixture.maxDaysPerRenewal
  const newDueDate = useMemo(() => requestedDays === 3 ? '20/10/2026 · 23:59' : '24/10/2026 · 23:59', [requestedDays])
  const blockedReason = status === 'overdue' ? 'Phiếu đã quá hạn, không được gia hạn.' : status === 'max-renewals' ? 'Phiếu đã đạt tối đa 2 lần gia hạn.' : status === 'blocked' ? 'Phiếu đang có nghĩa vụ chưa thanh toán.' : undefined

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <div className="space-y-4">
        <Card title="Tra cứu phiếu thuê" subtitle="Tìm bằng mã phiếu, số điện thoại hoặc CopyBarcode" bodyClassName="space-y-4">
          <PosScannerField label="Mã phiếu thuê / CopyBarcode" placeholder="RENT-20261008-0041 hoặc số điện thoại…" onScan={(value) => value === renewalFixture.reference || value === renewalFixture.customer.phone.replaceAll(' ', '') ? undefined : 'Không tìm thấy phiếu thuê.'} />
          <div className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-mono text-sm font-semibold text-slate-900">{renewalFixture.reference}</div><div className="mt-1 text-xs text-slate-500">{renewalFixture.customer.name} · {renewalFixture.customer.phone} · Hạng {renewalFixture.customer.tier}</div></div><Badge variant={status === 'active' ? 'success' : 'danger'} dot>{status === 'active' ? 'Đang cho thuê' : 'Cần xử lý'}</Badge></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><div className="text-[11px] text-slate-500">Ngày thuê</div><div className="mt-1 text-sm font-semibold text-slate-800">{renewalFixture.rentalDate}</div></div><div><div className="text-[11px] text-slate-500">Hạn trả cũ</div><div className="mt-1 text-sm font-semibold text-slate-800">{renewalFixture.dueDate}</div></div><div><div className="text-[11px] text-slate-500">Số lần đã gia hạn</div><div className="mt-1 text-sm font-semibold text-slate-800">{renewalFixture.renewalCount}/{renewalFixture.maxRenewals}</div></div></div></div>
          <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-xs"><thead className="bg-indigo-50/70 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Barcode / Đầu sách</th><th className="px-3 py-3 text-right">Giá bán = Cọc</th><th className="px-3 py-3 text-right">Thuê gốc / ngày</th><th className="px-3 py-3">Trạng thái</th></tr></thead><tbody className="divide-y divide-slate-100"><tr><td className="px-3 py-3"><div className="font-semibold text-slate-800">BC-2101 · Doraemon tập 01</div><div className="font-mono text-[10px] text-slate-400">CopyBarcode</div></td><td className="px-3 py-3 text-right">80.000đ</td><td className="px-3 py-3 text-right">2.000đ</td><td className="px-3 py-3"><Badge variant="brand" size="xs">Đang cho thuê</Badge></td></tr><tr><td className="px-3 py-3"><div className="font-semibold text-slate-800">BC-2102 · Conan tập 10</div><div className="font-mono text-[10px] text-slate-400">CopyBarcode</div></td><td className="px-3 py-3 text-right">100.000đ</td><td className="px-3 py-3 text-right">3.000đ</td><td className="px-3 py-3"><Badge variant="brand" size="xs">Đang cho thuê</Badge></td></tr></tbody></table></div>
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle aria-hidden="true" className="mr-1 inline size-4" />Phí phát sinh sẽ được đối soát cùng lịch sử phiếu khi khách trả sách.</div>
        </Card>
        <Card title="Lịch sử gia hạn" action={<History aria-hidden="true" className="size-4 text-slate-400" />}><div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-2 py-2">Lần</th><th className="px-2 py-2">Thực hiện</th><th className="px-2 py-2">Hạn cũ → Hạn mới</th><th className="px-2 py-2 text-right">Phí cộng dồn</th></tr></thead><tbody><tr className="border-t border-slate-100"><td className="px-2 py-3 font-semibold">1/2</td><td className="px-2 py-3">14/10/2026 · Trần Hải Phong</td><td className="px-2 py-3">14/10 23:59 → 17/10 23:59</td><td className="px-2 py-3 text-right">13.500đ</td></tr></tbody></table></div></Card>
      </div>
      <div className="space-y-4">
        <Card title="Thiết bị gia hạn" subtitle="Phí phát sinh chưa thu ngay; đưa vào quyết toán khi trả" bodyClassName="space-y-4">
          <SelectBox<RenewalDay> label="Số ngày muốn gia hạn thêm" value={String(requestedDays) as RenewalDay} options={[{ value: '3', label: '3 ngày' }, { value: '7', label: '7 ngày' }]} onChange={(value) => { setRequestedDays(Number(value)); setIsCalculated(false) }} searchable={false} />
          <TextField label="Hạn trả mới (preview)" value={newDueDate} readOnly variant="outlined" />
          <div className="space-y-2 text-xs"><div className="flex justify-between gap-3 text-slate-500"><span>Phí thuê bản đầu</span><strong>31.500đ</strong></div><div className="flex justify-between gap-3 text-slate-500"><span>Phí gia hạn đã ghi nhận</span><strong>13.500đ</strong></div><div className="flex justify-between gap-3 text-rose-600"><span>Phạt đã phát sinh</span><strong>7.500đ</strong></div><div className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-slate-800"><span>Nghĩa vụ dự kiến khi trả</span><strong className="text-lg">{formatVnd(renewalFixture.feePreview)}</strong></div></div>
          {blockedReason && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertTriangle aria-hidden="true" className="mr-1 inline size-4" />{blockedReason}</div>}
          <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" disabled={!canRenew} onClick={() => setIsCalculated(true)} icon={<CalendarClock aria-hidden="true" className="size-4" />}>Tính phí gia hạn dự kiến</Button><Button type="button" size="sm" disabled={!canRenew || !isCalculated} onClick={() => setStatus('active')} icon={<CheckCircle2 aria-hidden="true" className="size-4" />}>Xác nhận gia hạn</Button></div>
          {isCalculated && canRenew && <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-700">Hạn trả mới đã được tính. Phí phát sinh sẽ thu khi khách trả sách.</div>}
        </Card>
      </div>
    </div>
  )
}
