import { CalendarDays, Clock3, LogIn, LogOut, MapPin } from 'lucide-react'
import { Badge, Button, Card } from '@/components/common'
import type { AttendanceRowDisplay } from '../hr-shift.type'

type AttendanceCardProps = {
  row: AttendanceRowDisplay
  isHistorical: boolean
  onCheckIn: () => void
  onCheckOut: () => void
  onExplain: () => void
}

const attendanceConfig = {
  present: { label: 'Đã hoàn tất', variant: 'success' as const },
  late: { label: 'Đi trễ', variant: 'warning' as const },
  absent: { label: 'Vắng', variant: 'danger' as const },
  'missing-attendance': { label: 'Thiếu chấm công', variant: 'danger' as const },
  'adjustment-pending': { label: 'Chờ Admin duyệt', variant: 'warning' as const },
}

export function AttendanceCard({ row, isHistorical, onCheckIn, onCheckOut, onExplain }: AttendanceCardProps) {
  const status = attendanceConfig[row.state]
  const canCheckIn = !isHistorical && !row.checkIn && row.state !== 'absent'
  const canCheckOut = !isHistorical && Boolean(row.checkIn) && !row.checkOut

  return (
    <Card className="overflow-hidden" padding="lg">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-900">{isHistorical ? 'Lịch sử điểm danh' : 'Điểm danh hôm nay'} · {row.employeeName}</p>
            <Badge dot variant={status.variant}>{status.label}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" size={14} />{row.workDate}</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" size={14} />{row.shiftOrder} · {row.timeRange ?? 'Chưa có khung giờ'}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" size={14} />{row.counterName ?? 'Chưa phân quầy'}</span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 lg:min-w-56">
          <p className="text-[11px] text-slate-500">Trạng thái trong ca</p>
          <p className="mt-1 font-semibold text-slate-800">{row.checkIn ? `Đã vào ca lúc ${row.checkIn}` : row.state === 'absent' ? 'Không ghi nhận có mặt' : 'Chưa điểm danh vào ca'}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-3">
        <div><p className="text-slate-500">Check-in</p><p className="mt-1 font-semibold text-slate-800">{row.checkIn ?? '—'}</p></div>
        <div><p className="text-slate-500">Check-out</p><p className="mt-1 font-semibold text-slate-800">{row.checkOut ?? '—'}</p></div>
        <div><p className="text-slate-500">Giờ công</p><p className={row.workedHours === undefined ? 'mt-1 font-semibold text-rose-600' : 'mt-1 font-semibold text-slate-800'}>{row.workedHours === undefined ? 'Thiếu chấm công' : `${row.workedHours} giờ`}</p></div>
      </div>

      <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
        <Button disabled={!canCheckIn} icon={<LogIn aria-hidden="true" size={15} />} onClick={onCheckIn} size="sm" variant="secondary">Điểm danh vào ca</Button>
        <Button disabled={!canCheckOut} icon={<LogOut aria-hidden="true" size={15} />} onClick={onCheckOut} size="sm">Điểm danh ra ca</Button>
        <Button disabled={isHistorical} onClick={onExplain} size="sm" variant="secondary">Gửi giải trình quên chấm công</Button>
      </div>
    </Card>
  )
}
