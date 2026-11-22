import { useQuery } from '@tanstack/react-query'
import { getDashboardOverview } from './dashboard.service'
import type { DashboardTrendRange } from './dashboard.type'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: (date?: string, trendRange: DashboardTrendRange = 'WEEK') =>
    [...dashboardKeys.all, 'overview', date ?? 'today', trendRange] as const,
}

export function useDashboardOverviewQuery(date?: string, trendRange: DashboardTrendRange = 'WEEK') {
  return useQuery({
    queryKey: dashboardKeys.overview(date, trendRange),
    queryFn: () => getDashboardOverview({ date, trendRange }),
  })
}
