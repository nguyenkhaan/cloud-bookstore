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
  tierName?: string
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

// ── CUS-003: history ─────────────────────────────────────────────
export type CustomerHistoryTab = 'rentals' | 'sales' | 'buybacks' | 'violations'

export type CustomerHistoryQuery = {
  page?: number
  pageSize?: number
  status?: string
  from?: string // yyyy-MM-dd
  to?: string
}

export type CustomerLatestDocument = { id: string; no: string; at: string; amount: number }

export type CustomerHistorySummary = {
  rentalCount: number
  saleCount: number
  buybackCount: number
  violationCount: number
  heldBookCount: number
  activeSlipCount: number
  depositHeld: number
  lateReturnCount: number
  openOverdueCount: number
  outstandingAmount: number
  blocksNewRental: boolean
  salesSpend: number
  salesDiscountTotal: number
  rentalSpend: number
  computedEligibleSpend: number
  storedEligibleSpend: number
  eligibleSpendMismatch: boolean
  buybackPaidTotal: number
  latestSale: CustomerLatestDocument | null
  latestBuyback: CustomerLatestDocument | null
}

export type RentalLineSummary = {
  lineId: string
  copyId: string
  copyBarcode: string
  titleName: string
  volumeLabel: string | null
  status: string
  depositAmount: number
}

export type CustomerRentalItem = {
  slipId: string
  slipNo: string
  status: string
  rentDate: string
  activatedAt: string | null
  dueAt: string | null
  extensionCount: number
  lateDays: number
  isOverdue: boolean
  depositTotal: number
  refundTotal: number
  outstandingAmount: number
  countedSpend: number
  returnId: string | null
  returnNo: string | null
  returnStatus: string | null
  returnedAt: string | null
  lines: RentalLineSummary[]
}

export type SaleLineSummary = {
  lineId: string
  copyId: string
  copyBarcode: string
  titleName: string
  volumeLabel: string | null
  listPrice: number
  finalPrice: number
  status: string
}

export type CustomerSaleItem = {
  invoiceId: string
  invoiceNo: string | null
  status: string
  occurredAt: string
  subtotal: number
  discountTotal: number
  totalPayable: number
  countedAmount: number
  hasReversedLines: boolean
  isFullyReversed: boolean
  lines: SaleLineSummary[]
}

export type BuybackLineSummary = {
  titleName: string
  volumeLabel: string | null
  conditionGrade: string
  quantity: number
  unitCost: number
}

export type CustomerBuybackItem = {
  receiptId: string
  code: string
  status: string
  occurredAt: string
  totalAmount: number
  isPaidOut: boolean
  needsApproval: boolean
  lines: BuybackLineSummary[]
}

export type CustomerViolationItem = {
  lineId: string
  slipId: string
  slipNo: string
  returnId: string | null
  returnNo: string | null
  copyId: string
  copyBarcode: string
  titleName: string
  volumeLabel: string | null
  occurredAt: string
  dueAt: string
  result: 'OPEN_OVERDUE' | 'AWAITING_PAYMENT' | 'SETTLED'
  lateDays: number
  latePenalty: number
  damagePenalty: number
  lostRetainedAmount: number
  outstandingAmount: number
}
