import { Badge, Button, Card } from '@/components/common'
import type { ShiftRecordDisplay } from '../hr-shift.type'

type ShiftRecordsTableProps = {
  records: ShiftRecordDisplay[]
  isAdminView: boolean
  onView: (record: ShiftRecordDisplay) => void
}

const stateConfig = {
  assigned: { label: 'Đã phân công', variant: 'success' as const },
  unassigned: { label: 'Thiếu người', variant: 'warning' as const },
  'attendance-missing': { label: 'Thiếu chấm công', variant: 'danger' as const },
}

function StatusBadge({ state }: { state: ShiftRecordDisplay['state'] }) {
  const config = stateConfig[state as keyof typeof stateConfig] ?? stateConfig.unassigned
  return <Badge dot variant={config.variant}>{config.label}</Badge>
}

export function ShiftRecordsTable({ records, isAdminView, onView }: ShiftRecordsTableProps) {
  if (records.length === 0) {
    return (
      <Card padding="lg" title="Bản ghi ca">
        <div className="flex min-h-50 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
          <p className="text-sm font-semibold text-slate-800">Chưa có bản ghi trong ngày đã chọn</p>
          <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Hãy đổi bộ lọc hoặc tạo bản ghi ca để bắt đầu phân công theo ngày.</p>
          {isAdminView && <p className="mt-3 text-xs font-semibold text-indigo-600">Action thêm bản ghi chỉ hiển thị trong Admin view.</p>}
        </div>
      </Card>
    )
  }

  return (
    <Card padding="lg" subtitle={`${records.length} bản ghi hiển thị`} title="Bản ghi ca">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-180 text-left text-xs">
          <thead className="bg-indigo-50 text-[11px] font-semibold text-slate-500">
            <tr>
              <th className="rounded-l-lg px-3 py-2.5">Ngày làm</th>
              <th className="px-3 py-2.5">Nhân viên</th>
              <th className="px-3 py-2.5">Thứ tự ca</th>
              <th className="px-3 py-2.5">Khoảng thời gian</th>
              <th className="px-3 py-2.5">Trạng thái phân công</th>
              <th className="rounded-r-lg px-3 py-2.5 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => (
              <tr key={record.id}>
                <td className="px-3 py-3 text-slate-600">{record.workDate}</td>
                <th className="px-3 py-3 font-semibold text-slate-800">{record.employeeId ? `${record.employeeId} · ${record.employeeName}` : 'Chưa phân công'}</th>
                <td className="px-3 py-3 text-slate-600">{record.shiftOrder}</td>
                <td className="px-3 py-3 text-slate-600">{record.timeRange}</td>
                <td className="px-3 py-3"><StatusBadge state={record.state} /></td>
                <td className="px-3 py-3 text-right"><Button aria-label={`Xem bản ghi ${record.id}`} onClick={() => onView(record)} size="xs" variant="ghost">Xem</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {records.map((record) => (
          <article className="rounded-xl border border-slate-200 p-4" key={record.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{record.employeeId ? record.employeeName : 'Chưa phân công'}</h3>
                <p className="mt-1 text-xs text-slate-500">{record.workDate} · {record.shiftOrder}</p>
              </div>
              <StatusBadge state={record.state} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-600">
              <span>{record.timeRange}</span>
              <Button aria-label={`Xem bản ghi ${record.id}`} onClick={() => onView(record)} size="xs" variant="ghost">Xem chi tiết</Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  )
}
