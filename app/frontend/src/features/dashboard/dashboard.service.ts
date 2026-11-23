import axios from 'axios'
import { privateClient } from '@/api/client'
import type { DashboardTrendRange, OverviewReportResponse } from './dashboard.type'

export class DashboardApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'DashboardApiError'
    this.status = status
  }
}

function toMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined
    if (data && typeof data.detail === 'string') return data.detail
    if (data && typeof data.message === 'string') return data.message
    if (data && typeof data.title === 'string') return data.title
    return error.message
  }
  return error instanceof Error ? error.message : 'Không thể tải dữ liệu tổng quan kinh doanh.'
}

export async function getDashboardOverview(params: {
  date?: string
  trendRange?: DashboardTrendRange
} = {}): Promise<OverviewReportResponse> {
  try {
    const query: Record<string, string> = {}
    if (params.date) query.date = params.date
    if (params.trendRange) query.trendRange = params.trendRange

    const response = await privateClient.get<OverviewReportResponse>('/reports/overview', {
      params: query,
    })
    return response.data
  } catch (error) {
    throw new DashboardApiError(axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0, toMessage(error))
  }
}
