type AttendanceDateFilterProps = {
  date: string
  onChange: (value: string) => void
}

export function AttendanceDateFilter({ date, onChange }: AttendanceDateFilterProps) {
  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:max-w-xs">
      <label className="block text-xs font-semibold text-slate-700" htmlFor="attendance-date-filter">Ngày cần xem</label>
      <input
        aria-describedby="attendance-date-filter-hint"
        className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15"
        id="attendance-date-filter"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={date}
      />
      <p className="mt-2 text-[11px] leading-4 text-slate-500" id="attendance-date-filter-hint">Chọn ngày để xem lại các ca đã điểm danh.</p>
    </div>
  )
}
