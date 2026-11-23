import { useEffect, useRef, useState } from 'react'
import { Button, DateInput, SelectBox } from '@/components/common'
import type { SelectOption } from '@/components/common/SelectBox/selectBox.utils'
import type { ShiftRecordDisplay } from '../hr-shift.type'

type ShiftRecordDrawerProps = {
  open: boolean
  readOnly: boolean
  record?: ShiftRecordDisplay
  onClose: () => void
  onSave: (record: ShiftRecordDisplay) => void
}

const employeeOptions: SelectOption[] = [
  { value: 'NV-0002', label: 'NV-0002 · Trần Hoàng Phong' },
  { value: 'NV-0003', label: 'NV-0003 · Lê Minh Khoa' },
  { value: 'NV-0005', label: 'NV-0005 · Lê Mai Linh' },
]

const shiftOptions: SelectOption[] = [
  { value: 'Ca sáng', label: 'Ca sáng · 08:00–13:00' },
  { value: 'Ca chiều', label: 'Ca chiều · 13:00–18:00' },
  { value: 'Ca tối', label: 'Ca tối · 18:00–22:30' },
]

export function ShiftRecordDrawer({ open, readOnly, record, onClose, onSave }: ShiftRecordDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [employee, setEmployee] = useState(record?.employeeId ?? 'NV-0002')
  const [date, setDate] = useState('2026-10-18')
  const [shiftOrder, setShiftOrder] = useState(record?.shiftOrder ?? 'Ca sáng')
  const [note, setNote] = useState(record?.note ?? '')

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, record])

  if (!open) return null

  const selectedEmployee = employeeOptions.find((option) => option.value === employee)?.label ?? 'Chưa phân công'
  return (
    <div aria-modal="true" className="fixed inset-0 z-50 bg-slate-900/35" role="dialog">
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <h2 className="mt-1 text-lg font-bold text-slate-900">{readOnly ? 'Chi tiết bản ghi ca' : 'Thêm bản ghi ca'}</h2>
          <button aria-label="Đóng drawer bản ghi ca" className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" onClick={onClose} ref={closeButtonRef} type="button">×</button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <SelectBox disabled={readOnly} label="Nhân viên" onChange={setEmployee} options={employeeOptions} value={employee} />
          <div>
            <label className="block text-xs font-semibold text-slate-600" htmlFor="record-work-date">Ngày làm</label>
            <div className="mt-2"><DateInput disabled={readOnly} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15" id="record-work-date" onChange={(event) => setDate(event.target.value)} value={date} /></div>
          </div>
          <SelectBox disabled={readOnly} label="Thứ tự ca" onChange={setShiftOrder} options={shiftOptions} value={shiftOrder} />
          <div>
            <label className="block text-xs font-semibold text-slate-600" htmlFor="record-note">Ghi chú</label>
            <textarea disabled={readOnly} className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15" id="record-note" onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú bàn giao hoặc yêu cầu đặc biệt" value={note} />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-6 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="secondary">Hủy</Button>
          {!readOnly && <Button onClick={() => onSave({ id: record?.id ?? `shift-${Date.now()}`, workDate: date.split('-').reverse().join('/'), employeeId: employee, employeeName: selectedEmployee.split(' · ')[1], shiftOrder, timeRange: shiftOptions.find((option) => option.value === shiftOrder)?.label.split(' · ')[1] ?? '', state: 'assigned', note })}>Lưu bản ghi ca</Button>}
        </div>
      </div>
    </div>
  )
}
