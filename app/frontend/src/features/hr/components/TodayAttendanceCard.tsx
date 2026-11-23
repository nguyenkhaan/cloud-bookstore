import { Badge, Button, Card } from '@/components/common'
import type { AttendanceRowDisplay } from '../hr-shift.type'

type TodayAttendanceCardProps = {
  row: AttendanceRowDisplay
  onCheckIn: () => void
  onCheckOut: () => void
}

export function TodayAttendanceCard({ row, onCheckIn, onCheckOut }: TodayAttendanceCardProps) {
  return (
    <Card padding="lg" title={`Điểm danh hôm nay · ${row.employeeName}`}>
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-4xl font-bold tracking-tight text-indigo-600">10:24:36</p>
          <p className="mt-2 text-xs text-slate-500">18/10/2026 · {row.shiftOrder} · Quầy 01</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-4 lg:min-w-55">
          <Badge dot variant="success">{row.checkIn ? `Đã vào ca lúc ${row.checkIn}` : 'Chưa vào ca'}</Badge>
      
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button disabled={Boolean(row.checkIn)} onClick={onCheckIn} variant="secondary">Điểm danh vào ca</Button>
        <Button disabled={!row.checkIn || Boolean(row.checkOut)} onClick={onCheckOut}>Điểm danh ra ca</Button>
        <Button variant="secondary">Gửi giải trình quên chấm công</Button>
      </div>
    </Card>
  )
}
