import { SelectBox } from '@/components/common'
import type { SelectOption } from '@/components/common/SelectBox/selectBox.utils'

export type ShiftStatusFilter = 'all' | 'assigned' | 'unassigned' | 'attendance-missing' | 'empty'

type ShiftDateToolbarProps = {
  date: string
  employee: string
  shiftOrder: string
  status: ShiftStatusFilter
  onDateChange: (value: string) => void
  onEmployeeChange: (value: string) => void
  onShiftOrderChange: (value: string) => void
  onStatusChange: (value: ShiftStatusFilter) => void
}

const employeeOptions: SelectOption[] = [
  { value: 'all', label: 'Tất cả nhân viên' },
  { value: 'NV-0002', label: 'NV-0002 · Trần Hoàng Phong' },
  { value: 'NV-0003', label: 'NV-0003 · Lê Minh Khoa' },
  { value: 'NV-0005', label: 'NV-0005 · Lê Mai Linh' },
]

const shiftOptions: SelectOption[] = [
  { value: 'all', label: 'Tất cả thứ tự ca' },
  { value: 'morning', label: 'Ca sáng · 08:00–13:00' },
  { value: 'afternoon', label: 'Ca chiều · 13:00–18:00' },
  { value: 'evening', label: 'Ca tối · 18:00–22:30' },
]

const statusOptions: SelectOption<ShiftStatusFilter>[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'assigned', label: 'Đã phân công' },
  { value: 'unassigned', label: 'Thiếu người' },
  { value: 'attendance-missing', label: 'Thiếu chấm công' },
  { value: 'empty', label: 'Không có bản ghi' },
]

export function ShiftDateToolbar({
  date,
  employee,
  shiftOrder,
  status,
  onDateChange,
  onEmployeeChange,
  onShiftOrderChange,
  onStatusChange,
}: ShiftDateToolbarProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:grid-cols-2 xl:grid-cols-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600" htmlFor="shift-date">Ngày làm</label>
        <input className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15" id="shift-date" onChange={(event) => onDateChange(event.target.value)} type="date" value={date} />
      </div>
      <SelectBox label="Nhân viên" onChange={onEmployeeChange} options={employeeOptions} value={employee} />
      <SelectBox label="Thứ tự ca" onChange={onShiftOrderChange} options={shiftOptions} value={shiftOrder} />
      <SelectBox<ShiftStatusFilter> label="Trạng thái bản ghi" onChange={onStatusChange} options={statusOptions} value={status} />
    </div>
  )
}
