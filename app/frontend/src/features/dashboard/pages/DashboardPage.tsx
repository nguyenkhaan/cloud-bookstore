import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { StatCard } from '@/components/common'
import { MainLayout } from '@/components/layout'
import { useAuth } from '@/features/auth/auth.hook'
import type { DashboardPageProps, DashboardTrendRange } from '@/features/dashboard/dashboard.type'
import { workspacePathFor } from '@/features/workspace/workspace.route'
import { AttentionPanel } from '../components/AttentionPanel'
import { LowStockAlertsTable } from '../components/LowStockAlertsTable'
import { OverdueRentalsTable } from '../components/OverdueRentalsTable'
import { RevenueDonutChart } from '../components/RevenueDonutChart'
import { RevenueTrendChart } from '../components/RevenueTrendChart'
import { TopRentedTitlesCard } from '../components/TopRentedTitlesCard'
import { useDashboardOverviewQuery } from '../dashboard.hook'
import {
  formatPercent,
  formatVnd,
  getTodayVnDateInput,
} from '../dashboard.presentation'

export function DashboardPage({ onSignOut }: DashboardPageProps) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const currentUser = session?.user ?? { name: 'Khách', role: 'Chưa xác thực', roleCode: '' }
  const isAdmin = currentUser.roleCode === 'ADMIN'

  const [selectedDate, setSelectedDate] = useState<string>(getTodayVnDateInput)
  const [trendRange, setTrendRange] = useState<DashboardTrendRange>('WEEK')

  const overviewQuery = useDashboardOverviewQuery(selectedDate, trendRange)
  const data = overviewQuery.data

  const todayVn = getTodayVnDateInput()
  const dateBadgeSuffix = selectedDate === todayVn ? 'Hôm nay' : 'Theo ngày chọn'
  const monthNumber = selectedDate.split('-')[1] ?? ''
  const yearNumber = selectedDate.split('-')[0] ?? ''
  const topRentedLabel = monthNumber && yearNumber ? `Tháng ${monthNumber}/${yearNumber}` : 'Tháng hiện tại'

  return (
    <MainLayout
      onSignOut={onSignOut}
      currentPath="overview"
      onNavigate={(id) => {
        const path = workspacePathFor(id)
        if (path) navigate(path)
      }}
      pageTitle="Tổng quan kinh doanh"
      breadcrumbs={[{ label: 'Không gian làm việc' }, { label: 'Tổng quan' }]}
      user={currentUser}
      actionButton={
        <div className="flex items-center gap-2">
          <label
            htmlFor="dashboard-date-picker"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs"
          >
            <Calendar className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
            <input
              id="dashboard-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value)
              }}
              aria-label="Chọn ngày xem tổng quan"
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            />
            <span className="hidden text-slate-400 sm:inline">· {dateBadgeSuffix}</span>
          </label>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          {data?.isCashierScoped && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
              Phạm vi ca thu ngân hiện tại
            </span>
          )}
        </div>

        {overviewQuery.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            {overviewQuery.error instanceof Error
              ? overviewQuery.error.message
              : 'Không thể tải dữ liệu tổng quan kinh doanh.'}
          </div>
        )}

        {/* Row 1: 5 KPI Cards */}
        {overviewQuery.isLoading && !data ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Bán + Thuê đã quyết toán"
              value={formatVnd(data?.totalSettledRevenueToday)}
              valueColor="emerald"
              description={`Bán ${formatVnd(data?.salesRevenueToday)} + Thuê ${formatVnd(data?.rentalRevenueToday)}`}
            />
            <StatCard
              label="Số dư két tiền mặt"
              value={formatVnd(data?.cashDrawerBalance)}
              valueColor="default"
              description={`${data?.activeCashSessionCount ?? 0} két đang hoạt động`}
            />
            <StatCard
              label="Cọc đang giữ · Nợ phải trả"
              value={formatVnd(data?.heldDepositsBalance)}
              valueColor="amber"
              description="KHÔNG tính vào doanh thu"
            />
            <StatCard
              label="Phiếu thuê lưu hành"
              value={data?.circulatingRentalSlipCount ?? 0}
              valueColor="default"
              description={`${data?.overdueRentalSlipCount ?? 0} phiếu quá hạn cần thu hồi`}
            />
            <StatCard
              label="VietQR đối soát thành công"
              value={formatPercent(data?.vietQrSuccessRatePct)}
              valueColor="emerald"
              description={`Mục tiêu > ${data?.attention?.vietQrTargetPct ?? 95}% · ${data?.vietQrSucceededCount ?? 0}/${data?.vietQrTotalCount ?? 0} lượt`}
            />
          </div>
        )}

        {/* Row 2: Trend Chart + Revenue Donut */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueTrendChart
              points={data?.trendPoints ?? []}
              totalAmount={data?.trendTotalAmount ?? 0}
              trendRange={trendRange}
              onChangeRange={setTrendRange}
            />
          </div>
          <div>
            <RevenueDonutChart
              structure={
                data?.revenueStructure ?? {
                  salesAmount: 0,
                  rentalFeeAmount: 0,
                  penaltyAmount: 0,
                  lostBookAmount: 0,
                  totalAmount: 0,
                  salesPct: 0,
                  rentalFeePct: 0,
                  penaltyPct: 0,
                  lostBookPct: 0,
                }
              }
            />
          </div>
        </div>

        {/* Row 3: Top 10 Rented Titles + Attention */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TopRentedTitlesCard
              titles={data?.topRentedTitles ?? []}
              monthLabel={topRentedLabel}
            />
          </div>
          <div>
            <AttentionPanel
              attention={
                data?.attention ?? {
                  overdueSlipCount: 0,
                  overdueOver7DaysCustomerCount: 0,
                  lowStockEditionCount: 0,
                  outOfStockEditionCount: 0,
                  pendingReceiptCopyCount: 0,
                  vietQrPendingOrFailedCount: 0,
                  vietQrTargetPct: 95,
                }
              }
              vietQrSuccessRatePct={data?.vietQrSuccessRatePct ?? 0}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        {/* Row 4: Low stock + Overdue > 7 days */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <LowStockAlertsTable
            rows={data?.lowStockAlerts ?? []}
            totalLowStockCount={data?.attention?.lowStockEditionCount ?? 0}
          />
          <OverdueRentalsTable rows={data?.overdueCustomers ?? []} />
        </div>

      </div>
    </MainLayout>
  )
}

export default DashboardPage
