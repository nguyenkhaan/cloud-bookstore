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
