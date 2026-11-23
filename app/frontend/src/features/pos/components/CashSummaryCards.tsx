import { StatCard } from '@/components/common'

type CashSummaryCardsProps = {
  openingCash: number
  theoreticalCash: number
  countedCash: number
  variance: number
}

const formatVnd = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`

export function CashSummaryCards({ openingCash, theoreticalCash, countedCash, variance }: CashSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard description="Tiền mặt được bàn giao khi mở ca" label="Tiền đầu ca" value={formatVnd(openingCash)} />
      <StatCard description="Đầu ca + thu − chi" label="Tiền lý thuyết" value={formatVnd(theoreticalCash)} />
      <StatCard description="Tổng theo mệnh giá đã nhập" label="Tiền đã kiểm đếm" value={formatVnd(countedCash)} />
      <StatCard
        className={variance === 0 ? 'border-emerald-200/80' : 'border-rose-200/80'}
        description={variance === 0 ? 'Khớp sổ · Sẵn sàng bàn giao' : 'Cần giải trình và Admin xử lý'}
        label="Chênh lệch"
        value={formatVnd(variance)}
        valueColor={variance === 0 ? 'emerald' : 'rose'}
      />
    </div>
  )
}
