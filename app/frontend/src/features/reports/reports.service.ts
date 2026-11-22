import axios from 'axios'
import { privateClient } from '@/api/client'
import type {
  DepositReconciliationFilters,
  DepositReconciliationReportResponse,
  PagedRevenueExpenseDocuments,
  RevenueExpenseDocumentsFilters,
  RevenueExpenseFilters,
  RevenueExpenseReportResponse,
  TaxDeclarationFilters,
  TaxDeclarationReportResponse,
} from './reports.type'

export class ReportsApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ReportsApiError'
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
  return error instanceof Error ? error.message : 'Không thể tải dữ liệu báo cáo.'
}

export async function getRevenueExpenseReport(
  filters: RevenueExpenseFilters,
): Promise<RevenueExpenseReportResponse> {
  try {
    const params: Record<string, string | number> = {
      Page: filters.page,
      PageSize: filters.pageSize,
    }
    if (filters.from) params.From = filters.from
    if (filters.to) params.To = filters.to
    if (filters.source) params.Source = filters.source
    if (filters.method) params.Method = filters.method
    if (filters.search?.trim()) params.Search = filters.search.trim()

    const response = await privateClient.get<RevenueExpenseReportResponse>('/reports/revenue-expense', {
      params,
    })
    return response.data
  } catch (error) {
    throw new ReportsApiError(axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0, toMessage(error))
  }
}

export async function getRevenueExpenseDocuments(
  filters: RevenueExpenseDocumentsFilters,
): Promise<PagedRevenueExpenseDocuments> {
  try {
    const params: Record<string, string | number> = {
      Source: filters.source,
      Page: filters.page,
      PageSize: filters.pageSize,
    }
    if (filters.from) params.From = filters.from
    if (filters.to) params.To = filters.to
    if (filters.method) params.Method = filters.method
    if (filters.search?.trim()) params.Search = filters.search.trim()

    const response = await privateClient.get<PagedRevenueExpenseDocuments>('/reports/revenue-expense/documents', {
      params,
    })
    return response.data
  } catch (error) {
    throw new ReportsApiError(axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0, toMessage(error))
  }
}

export async function getDepositReconciliationReport(
  filters: DepositReconciliationFilters,
): Promise<DepositReconciliationReportResponse> {
  try {
    const params: Record<string, string | number> = {
      Page: filters.page,
      PageSize: filters.pageSize,
    }
    if (filters.from) params.From = filters.from
    if (filters.to) params.To = filters.to
    if (filters.status) params.Status = filters.status
    if (filters.search?.trim()) params.Search = filters.search.trim()

    const response = await privateClient.get<DepositReconciliationReportResponse>(
      '/reports/deposit-reconciliation',
      { params },
    )
    return response.data
  } catch (error) {
    throw new ReportsApiError(axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0, toMessage(error))
  }
}

export async function getTaxDeclarationReport(
  filters: TaxDeclarationFilters,
): Promise<TaxDeclarationReportResponse> {
  try {
    const response = await privateClient.get<TaxDeclarationReportResponse>('/reports/tax-declaration', {
      params: {
        PeriodType: filters.periodType,
        Year: filters.year,
        PeriodValue: filters.periodValue,
      },
    })
    return response.data
  } catch (error) {
    throw new ReportsApiError(axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0, toMessage(error))
  }
}
