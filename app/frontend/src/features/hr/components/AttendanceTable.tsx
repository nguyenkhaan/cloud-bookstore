import { Badge, Button, Card } from '@/components/common'
import type { AttendanceRowDisplay } from '../hr-shift.type'

type AttendanceTableProps = {
  rows: AttendanceRowDisplay[]
  onAdjust: (row: AttendanceRowDisplay) => void
}

const attendanceConfig = {
  present: { label: 'Có mặt', variant: 'success' as const },
  late: { label: 'Đi trễ', variant: 'warning' as const },
  absent: { label: 'Vắng', variant: 'danger' as const },
  'missing-attendance': { label: 'Thiếu chấm công', variant: 'danger' as const },
  'adjustment-pending': { label: 'Chờ Admin duyệt', variant: 'warning' as const },
}

const payrollConfig = {
  paid: { label: 'Đã trả', variant: 'success' as const },
  unpaid: { label: 'Chưa trả', variant: 'neutral' as const },
}

const formatVnd = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`

function AttendanceStatus({ state }: { state: AttendanceRowDisplay['state'] }) {
  const config = attendanceConfig[state]
  return <Badge dot variant={config.variant}>{config.label}</Badge>
}

export function AttendanceTable({ rows, onAdjust }: AttendanceTableProps) {
  if (rows.length === 0) {
    return <Card padding="lg" title="Bản ghi chấm công"><div className="flex min-h-50 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-xs text-slate-500">Không có bản ghi phù hợp với bộ lọc.</div></Card>
  }

  return (
    <Card padding="lg" subtitle={`${rows.length} bản ghi/lần làm`} title="Chấm công và lương ca">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-220 text-left text-xs">
          <thead className="bg-indigo-50 text-[11px] font-semibold text-slate-500">
            <tr>
              <th className="rounded-l-lg px-3 py-2.5">Nhân viên</th>
              <th className="px-3 py-2.5">Ngày làm</th>
              <th className="px-3 py-2.5">Thứ tự ca</th>
              <th className="px-3 py-2.5">Check-in</th>
              <th className="px-3 py-2.5">Check-out</th>
              <th className="px-3 py-2.5">Giờ công</th>
              <th className="px-3 py-2.5">Trạng thái</th>
              <th className="px-3 py-2.5">Lương ca</th>
              <th className="rounded-r-lg px-3 py-2.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <th className="px-3 py-3 font-semibold text-slate-800">{row.employeeId} · {row.employeeName}</th>
                <td className="px-3 py-3 text-slate-600">{row.workDate}</td>
                <td className="px-3 py-3 text-slate-600">{row.shiftOrder}</td>
                <td className="px-3 py-3 text-slate-600">{row.checkIn ?? '—'}</td>
                <td className="px-3 py-3 text-slate-600">{row.checkOut ?? '—'}</td>
                <td className="px-3 py-3 text-slate-600">{row.workedHours === undefined ? <span className="font-semibold text-rose-600">Thiếu chấm công</span> : `${row.workedHours} giờ`}</td>
                <td className="px-3 py-3"><AttendanceStatus state={row.state} /></td>
                <td className="px-3 py-3"><div className="font-semibold text-slate-800">{formatVnd(row.shiftPay)}</div><Badge size="xs" variant={payrollConfig[row.payrollStatus].variant}>{payrollConfig[row.payrollStatus].label}</Badge></td>
                <td className="px-3 py-3 text-right"><Button aria-label={`Điều chỉnh chấm công cho ${row.employeeName}`} onClick={() => onAdjust(row)} size="xs" variant="ghost">Điều chỉnh</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article className="rounded-xl border border-slate-200 p-4" key={row.id}>
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">{row.employeeName}</h3><p className="mt-1 text-xs text-slate-500">{row.workDate} · {row.shiftOrder}</p></div><AttendanceStatus state={row.state} /></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Check-in</dt><dd className="mt-1 font-medium text-slate-800">{row.checkIn ?? '—'}</dd></div><div><dt className="text-slate-500">Check-out</dt><dd className="mt-1 font-medium text-slate-800">{row.checkOut ?? '—'}</dd></div><div><dt className="text-slate-500">Giờ công</dt><dd className="mt-1 font-medium text-slate-800">{row.workedHours === undefined ? 'Thiếu chấm công' : `${row.workedHours} giờ`}</dd></div><div><dt className="text-slate-500">Lương ca</dt><dd className="mt-1 font-medium text-slate-800">{formatVnd(row.shiftPay)} · {payrollConfig[row.payrollStatus].label}</dd></div></dl>
            <Button aria-label={`Điều chỉnh chấm công cho ${row.employeeName}`} className="mt-4" fullWidth onClick={() => onAdjust(row)} size="sm" variant="secondary">Điều chỉnh</Button>
          </article>
        ))}
      </div>
    </Card>
  )
}
