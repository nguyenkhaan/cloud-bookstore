import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Send, TriangleAlert, UserPlus, Users } from 'lucide-react'
import { Badge, Button, Card, SelectBox } from '@/components/common'
import { cn } from '@/lib/cn'

type RosterShift = {
  id: string
  day: string
  shift: 'Ca sáng' | 'Ca chiều' | 'Ca tối'
  employees: string[]
  shortage?: boolean
}

const days = [
  { key: 'mon', label: 'Thứ Hai', date: '12/10' }, { key: 'tue', label: 'Thứ Ba', date: '13/10' },
  { key: 'wed', label: 'Thứ Tư', date: '14/10' }, { key: 'thu', label: 'Thứ Năm', date: '15/10' },
  { key: 'fri', label: 'Thứ Sáu', date: '16/10' }, { key: 'sat', label: 'Thứ Bảy', date: '17/10' },
  { key: 'sun', label: 'Chủ Nhật', date: '18/10' },
] as const

const shifts = [
  { label: 'Ca sáng', time: '08:00–13:00' },
  { label: 'Ca chiều', time: '13:00–18:00' },
  { label: 'Ca tối', time: '18:00–22:30' },
] as const

const names = ['Trần Hoàng Phong', 'Lê Mai Linh', 'Lê Minh Khoa', 'Nguyễn Thanh Tâm', 'Nguyễn Hoài An']
const availableStaff = [{ value: 'NV-0006', label: 'Nguyễn Hoài An' }] as const
const initialRoster: RosterShift[] = days.flatMap((day, dayIndex) => shifts.map((shift, shiftIndex) => {
  const shortage = (day.key === 'wed' && shift.label === 'Ca tối') || (day.key === 'sun' && shift.label === 'Ca chiều')
  const firstEmployee = names[(dayIndex + shiftIndex) % 4]
  return {
    id: `${day.key}-${shiftIndex}`,
    day: day.key,
    shift: shift.label,
    employees: shortage ? [] : shiftIndex === 0 ? [firstEmployee, names[(dayIndex + 1) % 4]] : [firstEmployee],
    shortage,
  }
}))

type WeeklyRosterProps = { actorName: string; isAdminView: boolean }

export function WeeklyRoster({ actorName, isAdminView }: WeeklyRosterProps) {
  const [roster, setRoster] = useState(initialRoster)
  const [weekOffset, setWeekOffset] = useState(0)
  const [view, setView] = useState<'store' | 'mine'>(isAdminView ? 'store' : 'mine')
  const [published, setPublished] = useState(false)
  const [availableEmployee, setAvailableEmployee] = useState<'NV-0006'>('NV-0006')
  const [assignmentNotice, setAssignmentNotice] = useState('')
  const shownRoster = useMemo(() => view === 'store' && isAdminView ? roster : roster.map((slot) => ({ ...slot, employees: slot.employees.filter((name) => name === actorName) })), [actorName, isAdminView, roster, view])
  const shortageCount = roster.filter((slot) => slot.shortage).length
  const assignedCount = roster.reduce((sum, slot) => sum + slot.employees.length, 0)
  const weekLabel = weekOffset === 0 ? '12–18/10/2026' : weekOffset < 0 ? '05–11/10/2026' : '19–25/10/2026'

  const addAvailableStaff = () => {
    const openSlot = roster.find((slot) => slot.shortage)
    if (!openSlot) return
    const employeeName = availableStaff.find((employee) => employee.value === availableEmployee)?.label ?? 'Nguyễn Hoài An'
    setRoster((current) => current.map((slot) => slot.id === openSlot.id ? { ...slot, employees: [employeeName], shortage: false } : slot))
    setAssignmentNotice(`Đã thêm ${employeeName} vào ${openSlot.shift.toLowerCase()}.`)
  }

  return <div className="space-y-5" data-testid="weekly-roster">
    <section className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-sm font-bold text-slate-900">Lập lịch phân ca làm việc</p><p className="mt-1 text-xs text-slate-600">Roster tuần {weekLabel} · Nhà sách Mây · {isAdminView ? 'Chế độ điều phối Quản lý' : 'Lịch làm việc của bạn'}</p></div>
      {isAdminView && <Button icon={<Send size={15} />} onClick={() => setPublished(true)} size="sm">{published ? 'Đã công bố' : 'Công bố lịch làm việc'}</Button>}
    </section>

    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div aria-label="Phạm vi lịch làm việc" className="flex w-full overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50 p-1 sm:w-auto" role="tablist">
        <button aria-selected={view === 'store'} className={cn('min-h-10 flex-1 rounded-lg px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600', view === 'store' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500', !isAdminView && 'cursor-not-allowed opacity-50')} disabled={!isAdminView} onClick={() => setView('store')} role="tab" type="button">Lịch toàn cửa hàng</button>
        <button aria-selected={view === 'mine'} className={cn('min-h-10 flex-1 rounded-lg px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600', view === 'mine' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500')} onClick={() => setView('mine')} role="tab" type="button">Lịch của tôi</button>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end"><Button aria-label="Tuần trước" icon={<ChevronLeft size={16} />} onClick={() => setWeekOffset((value) => value - 1)} size="sm" variant="ghost" /><span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700"><CalendarDays className="text-indigo-600" size={15} />{weekLabel}</span><Button aria-label="Tuần sau" icon={<ChevronRight size={16} />} onClick={() => setWeekOffset((value) => value + 1)} size="sm" variant="ghost" /></div>
    </div>

    {!isAdminView && <p className="text-xs text-slate-500">Chỉ hiển thị ca làm của bạn. Liên hệ quản lý nếu lịch cần điều chỉnh.</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Ca đã phân công', assignedCount, <Users className="text-indigo-600" key="users" size={17} />],
        ['Vị trí đã đủ', `${42 - shortageCount}/42`, <UserPlus className="text-emerald-600" key="staff" size={17} />],
        ['Ca thiếu nhân sự', shortageCount, <TriangleAlert className="text-rose-600" key="shortage" size={17} />],
        ['Cảnh báo trùng ca', 2, <TriangleAlert className="text-amber-600" key="warning" size={17} />],
      ].map(([label, value, icon]) => <Card className="min-w-0" key={String(label)} padding="sm"><div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500">{label}</p>{icon}</div><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></Card>)}
    </div>

    <Card className="overflow-hidden" padding="none"><div aria-label="Lịch phân ca tuần" className="overflow-x-auto"><div className="min-w-[960px]">
      <div className="grid grid-cols-[150px_repeat(7,minmax(115px,1fr))] border-b border-slate-200 bg-slate-50"><div className="p-3 text-xs font-semibold text-slate-500">Ca làm</div>{days.map((day) => <div className="border-l border-slate-200 p-3 text-center" key={day.key}><p className="text-xs font-bold text-slate-800">{day.label}</p><p className="mt-0.5 text-[11px] text-slate-500">{day.date}</p></div>)}</div>
      {shifts.map((shift) => <div className="grid grid-cols-[150px_repeat(7,minmax(115px,1fr))] border-b border-slate-100 last:border-b-0" key={shift.label}><div className="bg-slate-50/60 p-3"><p className="text-xs font-bold text-slate-800">{shift.label}</p><p className="mt-0.5 text-[11px] text-slate-500">{shift.time}</p></div>{days.map((day) => {
        const slot = shownRoster.find((candidate) => candidate.day === day.key && candidate.shift === shift.label)
        const sourceSlot = roster.find((candidate) => candidate.day === day.key && candidate.shift === shift.label)
        return <div className={cn('min-h-28 border-l border-slate-100 p-2', sourceSlot?.shortage && 'bg-rose-50/70')} key={day.key}><div className="space-y-1.5">{slot?.employees.map((employee) => <span className="block rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-800" key={employee}>{employee}</span>)}{sourceSlot?.shortage && isAdminView && <button className="w-full rounded-lg border border-dashed border-rose-300 px-2 py-1 text-left text-[11px] font-semibold text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600" onClick={addAvailableStaff} type="button">Cần bổ sung</button>}</div></div>
      })}</div>)}
    </div></div></Card>

    {isAdminView && <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]"><Card subtitle="Gán nhanh nhân viên còn trống cho một ca đang thiếu." title="Bổ sung nhân sự vào ca"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><SelectBox className="min-w-0 flex-1" label="Nhân viên khả dụng" onChange={setAvailableEmployee} options={availableStaff.slice()} searchable={false} value={availableEmployee} /><Button icon={<UserPlus size={15} />} onClick={addAvailableStaff}>Thêm vào ca</Button></div>{assignmentNotice && <p className="mt-3 text-xs text-emerald-700" role="status">{assignmentNotice}</p>}</Card><Card subtitle="Kiểm tra trước khi công bố lịch." title="Cảnh báo cần xử lý"><div className="space-y-2 text-xs"><Badge variant="danger">{shortageCount} ca cần bổ sung</Badge><p className="text-slate-600">2 cảnh báo trùng ca cần được quản lý xác nhận.</p></div></Card></div>}
  </div>
}
