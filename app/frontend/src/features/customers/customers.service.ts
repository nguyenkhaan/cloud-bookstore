import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import { privateClient } from '@/api/client'
import type {
  CreateCustomerRequest,
  Customer,
  CustomerDto,
  CustomerDuplicateCheckResult,
  CustomerListFilters,
  CustomerStats,
  CustomerStatsDto,
  PagedResult,
  PagedResultOfCustomerDto,
  UpdateCustomerRequest,
  CustomerBuybackItem,
  CustomerHistoryQuery,
  CustomerHistorySummary,
  CustomerRentalItem,
  CustomerSaleItem,
  CustomerViolationItem,
} from './customers.type'

export class CustomerApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'CustomerApiError'
    this.status = status
  }
}

function messageFrom(error: AxiosError<unknown>): string {
  const data = error.response?.data
  if (typeof data === 'object' && data !== null) {
    const body = data as Record<string, unknown>
    if (typeof body.message === 'string') return body.message
    if (typeof body.detail === 'string') return body.detail
    if (typeof body.title === 'string') return body.title
  }
  return error.message
}

async function requestData<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const response = await request()
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new CustomerApiError(error.response?.status ?? 500, messageFrom(error))
    }
    throw error
  }
}

function mapCustomerDto(dto: CustomerDto): Customer {
  return {
    id: dto.id ?? '',
    phone: dto.phone ?? '',
    fullName: dto.fullName ?? '',
    email: dto.email ?? null,
    nationalId: dto.nationalId ?? null,
    address: dto.address ?? null,
    tierId: dto.tierId ?? '',
    tierName: dto.tierName ?? 'REGULAR',
    tierRank: Number(dto.tierRank ?? 1),
    eligibleSpend: Number(dto.eligibleSpend ?? 0),
    isFlagged: Boolean(dto.isFlagged),
    flagReason: dto.flagReason ?? null,
    createdAt: dto.createdAt ?? new Date().toISOString(),
  }
}

export async function listCustomers(filters: CustomerListFilters = {}): Promise<PagedResult<Customer>> {
  const params: Record<string, string | number | boolean> = {}
  if (filters.page) params.Page = filters.page
  if (filters.pageSize) params.PageSize = filters.pageSize
  if (filters.search) params.Search = filters.search.trim()
  if (filters.tierId) params.TierId = filters.tierId
  if (filters.tierName) params.TierName = filters.tierName.trim()
  if (typeof filters.isFlagged === 'boolean') params.IsFlagged = filters.isFlagged

  const data = await requestData<PagedResultOfCustomerDto>(() =>
    privateClient.get('/customers', { params })
  )

  return {
    items: (data.items ?? []).map(mapCustomerDto),
    totalCount: Number(data.totalCount ?? 0),
    page: Number(data.page ?? 1),
    pageSize: Number(data.pageSize ?? 10),
    totalPages: Number(data.totalPages ?? 0),
    hasPreviousPage: Boolean(data.hasPreviousPage),
    hasNextPage: Boolean(data.hasNextPage),
  }
}

export async function getCustomerStats(): Promise<CustomerStats> {
  const data = await requestData<CustomerStatsDto>(() =>
    privateClient.get('/customers/stats')
  )

  return {
    totalCount: Number(data.totalCount ?? 0),
    silverCount: Number(data.silverCount ?? 0),
    goldCount: Number(data.goldCount ?? 0),
    flaggedCount: Number(data.flaggedCount ?? 0),
  }
}

export async function checkDuplicateCustomer(phone: string): Promise<CustomerDuplicateCheckResult> {
  const data = await requestData<CustomerDuplicateCheckResult>(() =>
    privateClient.get('/customers/check-duplicate', {
      params: { phone },
    })
  )

  return {
    isDuplicate: Boolean(data.isDuplicate),
    normalizedPhone: data.normalizedPhone ?? '',
    existingCustomer: data.existingCustomer ? mapCustomerDto(data.existingCustomer) : null,
  }
}

export async function getCustomer(id: string): Promise<Customer> {
  const data = await requestData<CustomerDto>(() =>
    privateClient.get(`/customers/${id}`)
  )
  return mapCustomerDto(data)
}

export async function createCustomer(request: CreateCustomerRequest): Promise<Customer> {
  const data = await requestData<CustomerDto>(() =>
    privateClient.post('/customers', request)
  )
  return mapCustomerDto(data)
}

export async function updateCustomer(id: string, request: UpdateCustomerRequest): Promise<Customer> {
  const data = await requestData<CustomerDto>(() =>
    privateClient.put(`/customers/${id}`, request)
  )
  return mapCustomerDto(data)
}

export async function deleteCustomer(id: string): Promise<void> {
  await requestData<void>(() =>
    privateClient.delete(`/customers/${id}`)
  )
}

// ── CUS-003: history ─────────────────────────────────────────────
function historyParams(query: CustomerHistoryQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (query.page) params.Page = query.page
  if (query.pageSize) params.PageSize = query.pageSize
  if (query.status) params.Status = query.status
  if (query.from) params.From = query.from
  if (query.to) params.To = query.to
  return params
}

async function getHistoryPage<T>(
    customerId: string,
    segment: 'rentals' | 'sales' | 'buybacks' | 'violations',
    query: CustomerHistoryQuery,
): Promise<PagedResult<T>> {
  const data = await requestData<Partial<PagedResult<T>>>(() =>
      privateClient.get(`/customers/${customerId}/history/${segment}`, { params: historyParams(query) }),
  )
  return {
    items: data.items ?? [],
    totalCount: Number(data.totalCount ?? 0),
    page: Number(data.page ?? 1),
    pageSize: Number(data.pageSize ?? 10),
    totalPages: Number(data.totalPages ?? 0),
    hasPreviousPage: Boolean(data.hasPreviousPage),
    hasNextPage: Boolean(data.hasNextPage),
  }
}

export function getCustomerHistorySummary(customerId: string): Promise<CustomerHistorySummary> {
  return requestData<CustomerHistorySummary>(() =>
      privateClient.get(`/customers/${customerId}/history/summary`),
  )
}

export const listCustomerRentals = (id: string, query: CustomerHistoryQuery = {}) =>
    getHistoryPage<CustomerRentalItem>(id, 'rentals', query)
export const listCustomerSales = (id: string, query: CustomerHistoryQuery = {}) =>
    getHistoryPage<CustomerSaleItem>(id, 'sales', query)
export const listCustomerBuybacks = (id: string, query: CustomerHistoryQuery = {}) =>
    getHistoryPage<CustomerBuybackItem>(id, 'buybacks', query)
export const listCustomerViolations = (id: string, query: CustomerHistoryQuery = {}) =>
    getHistoryPage<CustomerViolationItem>(id, 'violations', query)
