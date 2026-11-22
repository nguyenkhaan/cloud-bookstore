import { useQuery } from '@tanstack/react-query'
import {
  getDepositReconciliationReport,
  getRevenueExpenseDocuments,
  getRevenueExpenseReport,
  getTaxDeclarationReport,
} from './reports.service'
import type {
  DepositReconciliationFilters,
  RevenueExpenseDocumentsFilters,
  RevenueExpenseFilters,
  TaxDeclarationFilters,
} from './reports.type'

export const reportsQueryKeys = {
  all: ['reports'] as const,
  revenueExpense: (filters: RevenueExpenseFilters) =>
    ['reports', 'revenue-expense', filters] as const,
  revenueExpenseDocuments: (filters: RevenueExpenseDocumentsFilters) =>
    ['reports', 'revenue-expense', 'documents', filters] as const,
  depositReconciliation: (filters: DepositReconciliationFilters) =>
    ['reports', 'deposit-reconciliation', filters] as const,
  taxDeclaration: (filters: TaxDeclarationFilters) =>
    ['reports', 'tax-declaration', filters] as const,
}

export function useRevenueExpenseReportQuery(filters: RevenueExpenseFilters) {
  return useQuery({
    queryKey: reportsQueryKeys.revenueExpense(filters),
    queryFn: () => getRevenueExpenseReport(filters),
  })
}

export function useRevenueExpenseDocumentsQuery(
  filters: RevenueExpenseDocumentsFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: reportsQueryKeys.revenueExpenseDocuments(filters),
    queryFn: () => getRevenueExpenseDocuments(filters),
    enabled,
  })
}

export function useDepositReconciliationQuery(filters: DepositReconciliationFilters) {
  return useQuery({
    queryKey: reportsQueryKeys.depositReconciliation(filters),
    queryFn: () => getDepositReconciliationReport(filters),
  })
}

export function useTaxDeclarationQuery(filters: TaxDeclarationFilters) {
  return useQuery({
    queryKey: reportsQueryKeys.taxDeclaration(filters),
    queryFn: () => getTaxDeclarationReport(filters),
  })
}
