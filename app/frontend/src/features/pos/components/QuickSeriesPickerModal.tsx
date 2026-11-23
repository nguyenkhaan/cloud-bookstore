import { useEffect, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { Badge, Button, TextField } from '@/components/common'
import { quickSeriesFixture } from '../pos-transaction.fixture'
import type { QuickSeriesFixture } from '../pos-transaction.type'
import { formatVnd } from '../pos-transaction.utils'

interface QuickSeriesPickerModalProps {
  open: boolean
  onClose: () => void
  onApply: (fixture: QuickSeriesFixture) => void
}

export function QuickSeriesPickerModal({ open, onClose, onApply }: QuickSeriesPickerModalProps) {
  const [selectedVolumes, setSelectedVolumes] = useState(quickSeriesFixture.selectedVolumes)
  const [query, setQuery] = useState('')
  const [agreedPrice, setAgreedPrice] = useState(quickSeriesFixture.agreedPricePerVolume)

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  const volumes = Array.from({ length: 20 }, (_, index) => `T.${String(index + 1).padStart(2, '0')}`)
  const visibleVolumes = volumes.filter((volume) => volume.toLowerCase().includes(query.toLowerCase()))
  const toggleVolume = (volume: string) => setSelectedVolumes((current) => current.includes(volume) ? current.filter((item) => item !== volume) : [...current, volume])
  const result: QuickSeriesFixture = { ...quickSeriesFixture, selectedVolumes, agreedPricePerVolume: agreedPrice }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="quick-series-title">
        <div className="border-b border-slate-200 p-5"><div className="flex items-start justify-between gap-4"><div><h2 id="quick-series-title" className="text-xl font-bold text-slate-900">Bộ chọn nhanh theo bộ truyện</h2></div><button type="button" aria-label="Đóng bộ chọn nhanh" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" onClick={onClose}><X aria-hidden="true" className="size-5" /></button></div></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="space-y-4"><TextField label="Tìm bộ truyện / đầu sách" placeholder="Thám tử lừng danh Conan…" value={query} onChange={(event) => setQuery(event.target.value)} variant="outlined" suffix={<Search aria-hidden="true" className="size-4 text-slate-400" />} /><div className="text-sm font-semibold text-slate-900">Bộ: {quickSeriesFixture.seriesName} · {quickSeriesFixture.publisher}</div><div className="flex flex-wrap gap-2"><Badge variant="neutral">Tất cả</Badge><Badge variant="brand">Tập 1–20</Badge><Badge variant="neutral">Tập 21–40</Badge><Badge variant="danger">Tập đang thiếu ({quickSeriesFixture.missingVolumes.length} tập)</Badge></div><div className="flex flex-wrap gap-2">{visibleVolumes.map((volume) => { const selected = selectedVolumes.includes(volume); const missing = quickSeriesFixture.missingVolumes.includes(volume); return <button key={volume} type="button" disabled={missing} aria-pressed={selected} className={`inline-flex min-w-12 items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${missing ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300' : selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'}`} onClick={() => toggleVolume(volume)}>{volume}{selected && <Check aria-hidden="true" className="size-3.5" />}</button> })}</div><div className="grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-[auto_1fr_1fr]"><div><div className="text-xs font-bold text-slate-800">Áp dụng cho {selectedVolumes.length} tập</div><div className="mt-2 flex gap-1"><Badge size="xs" variant="neutral">Grade A</Badge><Badge size="xs" variant="brand">Grade {quickSeriesFixture.grade}</Badge><Badge size="xs" variant="neutral">Grade C</Badge></div><div className="mt-3 text-xs text-slate-500">Giá bìa: 45.000đ/tập</div></div><TextField label="Giá thỏa thuận / tập" type="number" value={String(agreedPrice)} onChange={(event) => setAgreedPrice(Number(event.target.value) || 0)} variant="outlined" /><TextField label="Giá bán dự kiến / tập" value={formatVnd(quickSeriesFixture.expectedSalePricePerVolume)} readOnly variant="outlined" /></div></div></div>
        <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-slate-200 p-5 sm:flex-row sm:items-center"><div className="text-sm text-slate-600">Đã chọn: <strong>{selectedVolumes.length} tập</strong> · Draft chi trả: <strong className="text-lg text-indigo-600">{formatVnd(selectedVolumes.length * agreedPrice)}</strong></div><div className="flex gap-2"><Button type="button" variant="secondary" onClick={onClose}>Hủy bỏ</Button><Button type="button" disabled={selectedVolumes.length === 0} onClick={() => { onApply(result); onClose() }}>Áp dụng draft preview →</Button></div></div>
      </div>
    </div>
  )
}
