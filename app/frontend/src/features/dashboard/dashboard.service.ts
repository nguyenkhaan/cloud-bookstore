import type { DashboardOverviewMetrics } from './dashboard.type'

/**
 * Dashboard Service
 * Note: Formal backend APIs for business overview metrics, cash drawers, and reports
 * are scheduled for Phase 06 (Cash Drawer & Payments) and Phase 12-13 (Reports & Operations).
 */
export async function getDashboardOverviewMetrics(): Promise<DashboardOverviewMetrics> {
  // Placeholder for future Phase 12/13 API integration
  return {
    settledRevenue: 8420000,
    saleRevenue: 6200000,
    rentalRevenue: 2220000,
    cashBalance: 12680000,
    activeCashDrawers: 2,
    retainedDeposits: 18600000,
    circulatingRentals: 84,
    overdueRentals: 12,
    vietQrSuccessRate: 98.4,
    vietQrCompletedCount: 123,
    vietQrTotalCount: 125,
  }
}
