import { useEffect, useRef, useState } from 'react'
import { Badge, Button, TextField } from '@/components/common'
import type { AttendanceRowDisplay } from '../hr-shift.type'

type AttendanceAdjustmentDialogProps = {
  row?: AttendanceRowDisplay
  open: boolean
  onClose: () => void
  onSubmit: (reason: string, proposedValue: string) => void
}

export function AttendanceAdjustmentDialog({ row, open, onClose, onSubmit }: AttendanceAdjustmentDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [proposedValue, setProposedValue] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, row])

  if (!open || !row) return null
  const currentValue = `${row.checkIn ?? 'Thiếu check-in'} / ${row.checkOut ?? 'Thiếu check-out'}`

  return (
    <div aria-labelledby="attendance-adjustment-title" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs" role="dialog">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900" id="attendance-adjustment-title">Điều chỉnh chấm công</h2><p className="mt-1 text-xs text-slate-500">{row.employeeName} · {row.workDate} · {row.shiftOrder}</p></div><button aria-label="Đóng dialog điều chỉnh chấm công" className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" onClick={onClose} ref={closeButtonRef} type="button">×</button></div>
        <Badge className="mt-5" dot variant="warning">Đang chờ Admin duyệt</Badge>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Giá trị hiện tại</p><p className="mt-1 text-sm font-semibold text-slate-800">{currentValue}</p></div><div><TextField label="Giá trị đề nghị" onChange={(event) => setProposedValue(event.target.value)} placeholder="VD: 08:05 / 13:00" value={proposedValue} /></div></div>
        <div className="mt-4"><label className="block text-xs font-semibold text-slate-700" htmlFor="attendance-adjustment-reason">Lý do bắt buộc *</label><textarea aria-describedby="attendance-adjustment-hint" className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15" id="attendance-adjustment-reason" onChange={(event) => setReason(event.target.value)} placeholder="Nêu lý do và bằng chứng ca làm" value={reason} /><p className="mt-2 text-[11px] text-slate-500" id="attendance-adjustment-hint">UI demo không tự áp dụng thay đổi; request chỉ ở trạng thái chờ Admin duyệt.</p></div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button onClick={onClose} variant="secondary">Hủy</Button><Button disabled={!reason.trim() || !proposedValue.trim()} onClick={() => onSubmit(reason, proposedValue)}>Gửi yêu cầu điều chỉnh</Button></div>
      </div>
    </div>
  )
}
