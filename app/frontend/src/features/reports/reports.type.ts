import type { components } from '@/contract/api-contract'

export type PaymentMethodFilter = Exclude<components['schemas']['PaymentMethod'], null>

export type RevenueExpenseReportResponse = components['schemas']['RevenueExpenseReportResponse']
export type RevenueExpenseSourceRow = components['schemas']['RevenueExpenseSourceRowDto']
export type RevenueExpenseDocumentRow = components['schemas']['RevenueExpenseDocumentRowDto']
export type RevenueExpenseTrendBucket = components['schemas']['RevenueExpenseTrendBucketDto']
export type PagedRevenueExpenseDocuments = components['schemas']['PagedResultOfRevenueExpenseDocumentRowDto']

export type DepositReconciliationReportResponse = components['schemas']['DepositReconciliationReportResponse']
export type DepositReconciliationSlipRow = components['schemas']['DepositReconciliationSlipRowDto']

export type TaxDeclarationReportResponse = components['schemas']['TaxDeclarationReportResponse']
export type TaxRevenueItem = components['schemas']['TaxRevenueItemDto']
export type TaxExpenseItem = components['schemas']['TaxExpenseItemDto']
export type TaxExcludedItem = components['schemas']['TaxExcludedItemDto']

export type RevenueExpenseFilters = {
  from?: string
  to?: string
  source?: string
  method?: PaymentMethodFilter | ''
  search?: string
  page: number
  pageSize: number
}

export type RevenueExpenseDocumentsFilters = {
  from?: string
  to?: string
  source: string
  method?: PaymentMethodFilter | ''
  search?: string
  page: number
  pageSize: number
}

export type DepositReconciliationFilters = {
  from?: string
  to?: string
  status?: string
  search?: string
  page: number
  pageSize: number
}

export type TaxPeriodType = 'MONTH' | 'QUARTER'

export type TaxDeclarationFilters = {
  periodType: TaxPeriodType
  year: number
  periodValue: number
}
