export type DashboardPageProps = {
  onSignOut?: () => void
}

export type DashboardOverviewMetrics = {
  settledRevenue: number
  saleRevenue: number
  rentalRevenue: number
  cashBalance: number
  activeCashDrawers: number
  retainedDeposits: number
  circulatingRentals: number
  overdueRentals: number
  vietQrSuccessRate: number
  vietQrCompletedCount: number
  vietQrTotalCount: number
}
