import axios from 'axios'
import { privateClient } from '@/api/client'
import type {
  BuybackGrade,
  BuybackIsbnLookupResult,
  BuybackPayoutMethod,
  CustomerBuybackDetailDto,
} from './pos-buyback.utils'

type PagedBuybackResponse = {
  items?: CustomerBuybackDetailDto[]
}

export type CreateBuybackLinePayload = {
  editionId?: string | null
  isbn?: string | null
  titleName: string
  conditionGrade: BuybackGrade
  agreedBuyPrice: number
  expectedSellingPrice: number
  quantity: number
}

export type CreateBuybackPayload = {
  sellerName: string
  sellerPhone: string
  payoutMethod: BuybackPayoutMethod
  exceedReason?: string | null
  managerPin?: string | null
  completeImmediately: boolean
  lines: CreateBuybackLinePayload[]
}

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined
    if (typeof data?.message === 'string') return data.message
    if (typeof data?.detail === 'string') return data.detail
    if (typeof data?.title === 'string') return data.title
  }
  return err instanceof Error ? err.message : 'Thao tác thu mua thất bại.'
}

export async function fetchRecentBuybacks(): Promise<CustomerBuybackDetailDto[]> {
  try {
    const res = await privateClient.get<PagedBuybackResponse>('/buybacks', {
      params: { Page: 1, PageSize: 10 },
    })
    return res.data.items ?? []
  } catch (err) {
    throw new Error(extractErrorMessage(err))
  }
}

export async function lookupBuybackIsbn(query: string): Promise<BuybackIsbnLookupResult> {
  try {
    const res = await privateClient.get<BuybackIsbnLookupResult>(
      `/buybacks/lookup-isbn/${encodeURIComponent(query)}`,
    )
    return res.data
  } catch (err) {
    throw new Error(extractErrorMessage(err))
  }
}

export async function createCustomerBuyback(
  payload: CreateBuybackPayload,
): Promise<CustomerBuybackDetailDto> {
  try {
    const res = await privateClient.post<CustomerBuybackDetailDto>('/buybacks', payload)
    return res.data
  } catch (err) {
    throw new Error(extractErrorMessage(err))
  }
}

export async function completeCustomerBuyback(
  buybackId: string,
  payload: { payoutMethod: BuybackPayoutMethod; managerPin?: string | null; note?: string | null },
): Promise<CustomerBuybackDetailDto> {
  try {
    const res = await privateClient.post<CustomerBuybackDetailDto>(
      `/buybacks/${encodeURIComponent(buybackId)}/complete`,
      payload,
    )
    return res.data
  } catch (err) {
    throw new Error(extractErrorMessage(err))
  }
}
