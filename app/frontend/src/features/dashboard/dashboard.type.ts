import type { components } from '@/contract/api-contract'

export type DashboardPageProps = {
  onSignOut?: () => void
}

export type DashboardTrendRange = 'WEEK' | 'MONTH'

export type OverviewReportResponse = components['schemas']['OverviewReportResponse']
export type OverviewTrendPoint = components['schemas']['OverviewTrendPointDto']
export type OverviewRevenueStructure = components['schemas']['OverviewRevenueStructureDto']
export type TopRentedTitle = components['schemas']['TopRentedTitleDto']
export type OverviewAttention = components['schemas']['OverviewAttentionDto']
export type LowStockAlertRow = components['schemas']['LowStockAlertRowDto']
export type OverdueCustomerRow = components['schemas']['OverdueCustomerRowDto']
