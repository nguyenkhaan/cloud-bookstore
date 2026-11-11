import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  checkDuplicateCustomer,
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomerStats,
  listCustomers,
  updateCustomer,
} from './customers.service'
import type {
  CreateCustomerRequest,
  Customer,
  CustomerDuplicateCheckResult,
  CustomerListFilters,
  CustomerStats,
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
