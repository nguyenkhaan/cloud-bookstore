import { useQuery } from '@tanstack/react-query'
import { getDashboardOverviewMetrics } from './dashboard.service'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
}

export function useDashboardOverviewQuery() {
  return useQuery({
    queryKey: dashboardKeys.overview(),
    queryFn: getDashboardOverviewMetrics,
  })
}
