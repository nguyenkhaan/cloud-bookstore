import { StatCard } from '@/components/common'

type ShiftSummaryCardsProps = {
  totalRecords: number
  assignedEmployees: number
  unassignedRecords: number
  attendanceMissing: number
}

export function ShiftSummaryCards({ totalRecords, assignedEmployees, unassignedRecords, attendanceMissing }: ShiftSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard description="Các bản ghi/lần làm trong ngày đã chọn" label="Tổng bản ghi trong ngày" value={totalRecords} />
      <StatCard description="Nhân viên đã có trong bản ghi" label="Nhân viên đã phân công" value={assignedEmployees} valueColor="emerald" />
      <StatCard description="Cần bổ sung người trước khi vận hành" label="Ca còn thiếu người" value={unassignedRecords} valueColor="amber" />
      <StatCard description="Chưa có đủ check-in hoặc check-out" label="Cần bổ sung chấm công" value={attendanceMissing} valueColor="rose" />
    </div>
  )
}
