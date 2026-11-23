import { DateInput, SelectBox, TextField } from '@/components/common'
import type { SelectOption } from '@/components/common/SelectBox/selectBox.utils'
import type { AttendanceUiState, PayrollPaymentStatus } from '../hr-shift.type'

export type AttendanceStatusFilter = 'all' | AttendanceUiState
export type PayrollFilter = 'all' | PayrollPaymentStatus

type AttendanceFiltersProps = {
  date: string
  query: string
  status: AttendanceStatusFilter
  payroll: PayrollFilter
  onDateChange: (value: string) => void
  onQueryChange: (value: string) => void
  onStatusChange: (value: AttendanceStatusFilter) => void
  onPayrollChange: (value: PayrollFilter) => void
}

const statusOptions: SelectOption<AttendanceStatusFilter>[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'present', label: 'Có mặt' },
  { value: 'late', label: 'Đi trễ' },
  { value: 'absent', label: 'Vắng' },
  { value: 'missing-attendance', label: 'Thiếu chấm công' },
  { value: 'adjustment-pending', label: 'Chờ Admin duyệt' },
]

const payrollOptions: SelectOption<PayrollFilter>[] = [
  { value: 'all', label: 'Tất cả lương ca' },
  { value: 'paid', label: 'Đã trả' },
  { value: 'unpaid', label: 'Chưa trả' },
]

export function AttendanceFilters({ date, query, status, payroll, onDateChange, onQueryChange, onStatusChange, onPayrollChange }: AttendanceFiltersProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:grid-cols-2 xl:grid-cols-4">
      <TextField label="Tìm nhân viên / mã NV" variant="outlined" onChange={(event) => onQueryChange(event.target.value)} placeholder="Nhập tên hoặc mã…" value={query} />
      <div>
        <label className="block text-xs font-semibold text-slate-600" htmlFor="attendance-date">Ngày làm</label>
        <div className="mt-2"><DateInput className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15" id="attendance-date" onChange={(event) => onDateChange(event.target.value)} value={date} /></div>
      </div>
      <SelectBox<AttendanceStatusFilter> label="Trạng thái" onChange={onStatusChange} options={statusOptions} value={status} />
      <SelectBox<PayrollFilter> label="Trạng thái lương ca" onChange={onPayrollChange} options={payrollOptions} value={payroll} />
    </div>
  )
}
