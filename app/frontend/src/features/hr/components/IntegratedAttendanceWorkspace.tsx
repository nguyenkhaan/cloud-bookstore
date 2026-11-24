import { useMemo, useState } from 'react'
import { Download, LockKeyhole, Search, ShieldAlert } from 'lucide-react'
import { Badge, Button, Card, SelectBox } from '@/components/common'
import { attendanceDemoPunchFor, attendanceRows } from '../attendance.data'
import type { AttendanceRowDisplay, AttendanceUiState } from '../hr-shift.type'

type IntegratedAttendanceWorkspaceProps = { actorName: string; isAdminView: boolean }

const stateMeta: Record<AttendanceUiState, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  present: { label: 'Có mặt', variant: 'success' },
  late: { label: 'Đi trễ', variant: 'warning' },
  absent: { label: 'Vắng mặt', variant: 'danger' },
  'missing-attendance': { label: 'Thiếu chấm công', variant: 'warning' },
  'adjustment-pending': { label: 'Chờ điều chỉnh', variant: 'info' },
}

const statusOptions: Array<{ value: 'all' | AttendanceUiState; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'present', label: 'Có mặt' },
  { value: 'late', label: 'Đi trễ' },
  { value: 'missing-attendance', label: 'Thiếu chấm công' },
  { value: 'absent', label: 'Vắng mặt' },
]

function rowHours(row: AttendanceRowDisplay) {
  return row.workedHours === undefined ? '—' : `${row.workedHours.toFixed(1)} giờ`
}

export function IntegratedAttendanceWorkspace({ actorName, isAdminView }: IntegratedAttendanceWorkspaceProps) {
  const [rows, setRows] = useState(attendanceRows)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | AttendanceUiState>('all')
  const [notice, setNotice] = useState('')
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)
  const currentEmployeeId = rows.find((row) => row.employeeName === actorName)?.employeeId ?? 'NV-0002'
  const ownRows = rows.filter((row) => row.employeeId === currentEmployeeId)
  const visibleRows = isAdminView ? rows : rows.filter((row) => row.employeeId === currentEmployeeId)
  const currentShift = ownRows.find((row) => row.workDate === '18/10/2026' && row.state === 'missing-attendance') ?? ownRows[0]
  const filteredRows = useMemo(() => visibleRows.filter((row) => {
    const matchesQuery = `${row.employeeName} ${row.employeeId}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
    return matchesQuery && (status === 'all' || row.state === status)
  }), [query, status, visibleRows])

  const updateCurrentShift = (update: Partial<AttendanceRowDisplay>, message: string) => {
    if (!currentShift) return
    setRows((current) => current.map((row) => row.id === currentShift.id ? { ...row, ...update } : row))
    setNotice(message)
  }
  const metrics = {
    normalHours: visibleRows.reduce((sum, row) => sum + (row.workedHours ?? 0), 0).toFixed(1),
    overtime: 36,
    lateEarly: visibleRows.filter((row) => row.state === 'late').length,
    missing: visibleRows.filter((row) => row.state === 'missing-attendance').length,
  }

  return <div className="space-y-5" data-testid="integrated-attendance-workspace">
    <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <Card title="Điểm danh ca làm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><Badge dot variant={currentShift?.checkOut ? 'success' : 'warning'}>{currentShift?.checkOut ? 'Đã hoàn tất ca' : 'Đang trong ca'}</Badge><p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">10:24:36</p><p className="mt-1 text-xs text-slate-500">{currentShift?.shiftOrder ?? 'Chưa có ca'} · {currentShift?.timeRange ?? 'Không có dữ liệu ca'}</p></div><div className="flex gap-2"><Button disabled={Boolean(currentShift?.checkIn)} onClick={() => currentShift && updateCurrentShift({ checkIn: attendanceDemoPunchFor(currentShift).checkIn }, 'Đã ghi nhận check-in trong UI demo.')} size="sm" variant="secondary">Check-in</Button><Button disabled={!currentShift?.checkIn || Boolean(currentShift?.checkOut)} onClick={() => currentShift && updateCurrentShift({ checkOut: attendanceDemoPunchFor(currentShift).checkOut, workedHours: attendanceDemoPunchFor(currentShift).workedHours, state: 'present' }, 'Đã ghi nhận check-out trong UI demo.')} size="sm">Check-out</Button></div></div>
        <button className="mt-4 text-xs font-semibold text-indigo-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" onClick={() => setIsExplanationOpen((value) => !value)} type="button">Giải trình vắng mặt hoặc thiếu chấm công</button>
        {isExplanationOpen && <label className="mt-3 block text-xs font-medium text-slate-700">Lý do<textarea className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" placeholder="Nêu lý do để quản lý xem xét" /></label>}
      </Card>
      <Card subtitle="Tháng 10/2026" title="Kỳ công hiện tại"><div className="grid grid-cols-2 gap-3 text-xs"><div><p className="text-slate-500">Nhân sự</p><p className="mt-1 text-xl font-bold text-slate-900">{isAdminView ? 12 : 1}</p></div><div><p className="text-slate-500">Ngày đã chấm</p><p className="mt-1 text-xl font-bold text-slate-900">18/31</p></div><div className="col-span-2 rounded-xl bg-amber-50 p-3 text-amber-800"><strong>3 ca thiếu check-out</strong><span className="ml-1">cần được rà soát trước khi chốt.</span></div></div></Card>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[['Giờ công chuẩn', `${metrics.normalHours} giờ`], ['Làm thêm', `${metrics.overtime} giờ`], ['Đi trễ/về sớm', `${metrics.lateEarly}/3`], ['Thiếu check-out', `${metrics.missing} ca`]].map(([label, value]) => <Card key={label} padding="sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></Card>)}
    </div>

    <Card title="Bảng chấm công tổng thể">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><label className="relative min-w-0 flex-1 lg:max-w-sm"><span className="sr-only">Tìm nhân viên</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input className="min-h-10 w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nhân viên hoặc mã" type="search" value={query} /></label><SelectBox className="lg:w-52" label="Trạng thái" onChange={setStatus} options={statusOptions} searchable={false} value={status} /></div>
      <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-xs"><thead className="border-y border-slate-200 bg-slate-50 text-slate-500"><tr><th className="px-3 py-3 font-semibold">Nhân viên</th><th className="px-3 py-3 font-semibold">Ngày / ca</th><th className="px-3 py-3 font-semibold">Check-in</th><th className="px-3 py-3 font-semibold">Check-out</th><th className="px-3 py-3 font-semibold">Giờ công</th><th className="px-3 py-3 font-semibold">Trạng thái</th></tr></thead><tbody>{filteredRows.map((row) => <tr className="border-b border-slate-100" key={row.id}><td className="px-3 py-3"><p className="font-semibold text-slate-800">{row.employeeName}</p><p className="text-slate-500">{row.employeeId}</p></td><td className="px-3 py-3 text-slate-600">{row.workDate}<br />{row.shiftOrder}</td><td className="px-3 py-3 text-slate-600">{row.checkIn ?? '—'}</td><td className="px-3 py-3 text-slate-600">{row.checkOut ?? '—'}</td><td className="px-3 py-3 text-slate-600">{rowHours(row)}</td><td className="px-3 py-3"><Badge variant={stateMeta[row.state].variant}>{stateMeta[row.state].label}</Badge></td></tr>)}</tbody></table></div>
      {filteredRows.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Không có bản ghi phù hợp.</p>}
    </Card>

    {isAdminView && <div className="grid gap-4 xl:grid-cols-2"><Card title="Khóa công tháng"><div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><p className="font-semibold">Cần rà soát 3 ca thiếu check-out.</p><p className="mt-1">Thao tác chốt kỳ chưa được kết nối dữ liệu.</p></div><Button className="mt-3" disabled={true} icon={<LockKeyhole size={15} />} size="sm">Khóa công tháng</Button></Card><Card title="Mở khóa kỳ công"><div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Yêu cầu lý do và audit trail sẽ được kết nối khi API sẵn sàng.</div><Button className="mt-3" disabled={true} icon={<ShieldAlert size={15} />} size="sm" variant="secondary">Mở khóa kỳ công</Button></Card></div>}
    {notice && <p className="text-xs font-medium text-emerald-700" role="status">{notice}</p>}
  </div>
}
