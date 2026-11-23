import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CustomerApiError,
  checkDuplicateCustomer,
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomerHistorySummary,
  getCustomerStats,
  listCustomerBuybacks,
  listCustomerRentals,
  listCustomerSales,
  listCustomerViolations,
  listCustomers,
  updateCustomer,
} from './customers.service'
import type {
  CreateCustomerRequest,
  Customer,
  CustomerBuybackItem,
  CustomerDuplicateCheckResult,
  CustomerHistoryQuery,
  CustomerHistorySummary,
  CustomerListFilters,
  CustomerRentalItem,
  CustomerSaleItem,
  CustomerStats,
  CustomerViolationItem,
  PagedResult,
  UpdateCustomerRequest,
} from './customers.type'

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: CustomerListFilters = {}) => [...customerKeys.lists(), filters] as const,
  stats: () => [...customerKeys.all, 'stats'] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  duplicates: () => [...customerKeys.all, 'duplicate'] as const,
  history: (id: string) => [...customerKeys.all, 'history', id] as const,
  historySummary: (id: string) => [...customerKeys.history(id), 'summary'] as const,
  historyPage: (id: string, kind: string, query: CustomerHistoryQuery) =>
      [...customerKeys.history(id), kind, query] as const,
  duplicate: (phone: string) => [...customerKeys.duplicates(), phone] as const,
}

export function useCustomers(filters: CustomerListFilters = {}) {
  return useQuery<PagedResult<Customer>>({
    queryKey: customerKeys.list(filters),
    queryFn: () => listCustomers(filters),
  })
}

export function useCustomerStats() {
  return useQuery<CustomerStats>({
    queryKey: customerKeys.stats(),
    queryFn: () => getCustomerStats(),
  })
}

export function useCustomer(id: string) {
  return useQuery<Customer>({
    queryKey: customerKeys.detail(id),
    queryFn: () => getCustomer(id),
    enabled: Boolean(id),
  })
}

export function useCheckDuplicate(phone: string, enabled = true) {
  return useQuery<CustomerDuplicateCheckResult>({
    queryKey: customerKeys.duplicate(phone),
    queryFn: () => checkDuplicateCustomer(phone),
    enabled: enabled && Boolean(phone.trim()),
    staleTime: 5000,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation<Customer, Error, CreateCustomerRequest>({
    mutationFn: (request) => createCustomer(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation<Customer, Error, { id: string; request: UpdateCustomerRequest }>({
    mutationFn: ({ id, request }) => updateCustomer(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
    },
  })
}

// ── CUS-003: history ─────────────────────────────────────────────
const retryUnlessForbidden = (failureCount: number, error: Error) =>
    !(error instanceof CustomerApiError && error.status === 403) && failureCount < 2

export function useCustomerHistorySummary(id: string, enabled = true) {
  return useQuery<CustomerHistorySummary, Error>({
    queryKey: customerKeys.historySummary(id),
    queryFn: () => getCustomerHistorySummary(id),
    enabled: enabled && Boolean(id),
    retry: retryUnlessForbidden,
  })
}

export function useCustomerRentals(id: string, query: CustomerHistoryQuery = {}) {
  return useQuery<PagedResult<CustomerRentalItem>, Error>({
    queryKey: customerKeys.historyPage(id, 'rentals', query),
    queryFn: () => listCustomerRentals(id, query),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
    retry: retryUnlessForbidden,
  })
}

export function useCustomerSales(id: string, query: CustomerHistoryQuery = {}) {
  return useQuery<PagedResult<CustomerSaleItem>, Error>({
    queryKey: customerKeys.historyPage(id, 'sales', query),
    queryFn: () => listCustomerSales(id, query),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
    retry: retryUnlessForbidden,
  })
}

export function useCustomerBuybacks(id: string, query: CustomerHistoryQuery = {}) {
  return useQuery<PagedResult<CustomerBuybackItem>, Error>({
    queryKey: customerKeys.historyPage(id, 'buybacks', query),
    queryFn: () => listCustomerBuybacks(id, query),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
    retry: retryUnlessForbidden,
  })
}

export function useCustomerViolations(id: string, query: CustomerHistoryQuery = {}, enabled = true) {
  return useQuery<PagedResult<CustomerViolationItem>, Error>({
    queryKey: customerKeys.historyPage(id, 'violations', query),
    queryFn: () => listCustomerViolations(id, query),
    enabled: enabled && Boolean(id),
    placeholderData: keepPreviousData,
    retry: retryUnlessForbidden,
  })
}
