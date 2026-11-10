import type { components } from '@/contract/api-contract'

export type CustomerDto = components['schemas']['CustomerDto']
export type CreateCustomerRequest = components['schemas']['CreateCustomerRequest']
export type UpdateCustomerRequest = components['schemas']['UpdateCustomerRequest']
export type CustomerDuplicateCheckResult = components['schemas']['CustomerDuplicateCheckResult']
export type CustomerStatsDto = components['schemas']['CustomerStatsDto']
export type PagedResultOfCustomerDto = components['schemas']['PagedResultOfCustomerDto']

export type Customer = {
  id: string
  phone: string
  fullName: string
  email: string | null
  nationalId: string | null
  address: string | null
  tierId: string
  tierName: string
  tierRank: number
  eligibleSpend: number
  isFlagged: boolean
  flagReason: string | null
  createdAt: string
}

export type CustomerStats = {
  totalCount: number
  silverCount: number
  goldCount: number
  flaggedCount: number
}

export type CustomerListFilters = {
  page?: number
  pageSize?: number
  search?: string
  tierId?: string
  isFlagged?: boolean
}

export type PagedResult<T> = {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}
