import { StatCard } from '@/components/common'

type AttendanceSummaryCardsProps = {
  present: number
  late: number
  absent: number
  missing: number
}

export function AttendanceSummaryCards({ present, late, absent, missing }: AttendanceSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard description="Đủ dữ liệu check-in và check-out" label="Có mặt" value={present} valueColor="emerald" />
      <StatCard description="Có mặt nhưng bắt đầu trễ" label="Đi trễ" value={late} valueColor="amber" />
      <StatCard description="Không ghi nhận ca làm" label="Vắng" value={absent} valueColor="rose" />
      <StatCard description="Chờ bổ sung dữ liệu đầu ca/cuối ca" label="Thiếu chấm công" value={missing} valueColor="rose" />
    </div>
  )
}
