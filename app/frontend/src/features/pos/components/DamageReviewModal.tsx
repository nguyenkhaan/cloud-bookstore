import { useEffect, useState } from 'react'
import { Camera, CheckCircle2, ImagePlus, ShieldCheck, X } from 'lucide-react'
import { Button, SelectBox, TextField } from '@/components/common'
import { damageReviewFixture } from '../pos-transaction.fixture'
import type { BookCopyFixture, DamageApprovalPath } from '../pos-transaction.type'
import { formatVnd } from '../pos-transaction.utils'

interface DamageReviewModalProps {
  open: boolean
  copy?: BookCopyFixture
  onClose: () => void
  onConfirm: (path: DamageApprovalPath) => void
}

export function DamageReviewModal({ open, copy, onClose, onConfirm }: DamageReviewModalProps) {
  type DamageCondition = 'water-damage' | 'cover-tear' | 'missing-pages'
  const [approvalPath, setApprovalPath] = useState<DamageApprovalPath>(damageReviewFixture.approvalPath)
  const [note, setNote] = useState(damageReviewFixture.note)
  const [condition, setCondition] = useState<DamageCondition>('water-damage')

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null
  const targetCopy = copy ?? damageReviewFixture.copy
  const compensation = Math.round(targetCopy.actualSellingPrice * damageReviewFixture.illustrativeCompensationRate / 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="damage-review-title">
        <div className="border-b border-slate-200 p-5"><div className="flex items-start justify-between gap-4"><div><h2 id="damage-review-title" className="text-xl font-bold text-slate-900">Thẩm định hư hỏng ngoại lệ & Phê duyệt phạt</h2><p className="mt-1 text-sm text-slate-500">{damageReviewFixture.reference}</p></div><button type="button" aria-label="Đóng thẩm định hư hỏng" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" onClick={onClose}><X aria-hidden="true" className="size-5" /></button></div></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-bold text-slate-900">{targetCopy.copyBarcode} · {targetCopy.title} · {targetCopy.volume}</div><div className="mt-1 text-xs text-slate-500">Giá bán thực tế / cọc: {formatVnd(targetCopy.actualSellingPrice)}</div></div><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">HƯ HỎNG NGOẠI LỆ</span></div><SelectBox<DamageCondition> label="Mô tả tình trạng" value={condition} options={[{ value: 'water-damage', label: damageReviewFixture.condition }, { value: 'cover-tear', label: 'Rách bìa nhẹ' }, { value: 'missing-pages', label: 'Thiếu trang' }]} onChange={setCondition} searchable={false} /><div className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-700"><span>Mức khấu trừ đề xuất {damageReviewFixture.illustrativeCompensationRate}%</span><strong className="text-lg">{formatVnd(compensation)}</strong></div><div className="grid gap-3 sm:grid-cols-2"><button type="button" className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"><ImagePlus aria-hidden="true" className="size-5" />Ảnh 1: Vết rách bìa</button><button type="button" className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"><Camera aria-hidden="true" className="size-5" />Ảnh 2: Trang rách</button></div><Button type="button" size="sm" variant="ghost" icon={<Camera aria-hidden="true" className="size-4" />}>Chụp ảnh webcam / Tải ảnh</Button><div className="space-y-3 rounded-2xl border border-indigo-300 bg-indigo-50 p-4"><label className="flex cursor-pointer items-start gap-3"><input type="radio" name="damage-approval" checked={approvalPath === 'local-admin'} onChange={() => setApprovalPath('local-admin')} className="mt-1 accent-indigo-600" /><span><strong className="block text-sm text-indigo-900"><ShieldCheck aria-hidden="true" className="mr-1 inline size-4" />Admin phê duyệt tại chỗ</strong><span className="mt-1 block text-xs text-indigo-700">Nhập mã PIN và ghi chú của Admin đang có mặt tại quầy.</span></span></label>{approvalPath === 'local-admin' && <div className="grid gap-3 sm:grid-cols-[120px_1fr]"><TextField label="PIN 4 số *" value="••••" readOnly variant="outlined" /><TextField label="Ghi chú của Admin" value={note} onChange={(event) => setNote(event.target.value)} variant="outlined" /></div>}</div><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3"><input type="radio" name="damage-approval" checked={approvalPath === 'remote-admin'} onChange={() => setApprovalPath('remote-admin')} className="mt-1 accent-indigo-600" /><span><strong className="block text-sm text-slate-800">Gửi duyệt từ xa tới Trung tâm Phê duyệt</strong><span className="mt-1 block text-xs text-slate-500">Tạm khóa quyết toán trong thời gian chờ Admin xử lý.</span></span></label><div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{damageReviewFixture.unresolvedPolicyLabel} Số tiền sẽ được cập nhật sau khi Admin phê duyệt.</div></div></div>
        <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-200 p-5 sm:flex-row"><Button type="button" variant="secondary" onClick={onClose}>Hủy bỏ</Button><Button type="button" variant={approvalPath === 'local-admin' ? 'success' : 'primary'} onClick={() => onConfirm(approvalPath)} icon={<CheckCircle2 aria-hidden="true" className="size-4" />}>{approvalPath === 'local-admin' ? 'Xác nhận Admin & Hoàn tất' : 'Gửi yêu cầu Admin duyệt →'}</Button></div>
      </div>
    </div>
  )
}
