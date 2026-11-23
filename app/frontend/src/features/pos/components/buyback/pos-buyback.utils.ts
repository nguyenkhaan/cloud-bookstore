import type { SelectOption } from '@/components/common'

export type BuybackGrade = 'A' | 'B' | 'C' | 'D'
export type BuybackPayoutMethod = 'CASH' | 'BANK_TRANSFER'
export type BuybackApprovalStage = 'DRAFT' | 'PENDING' | 'APPROVED' | 'COMPLETED'

export type BuybackLineItem = {
  id: string
  editionId?: string | null
  isbn?: string | null
  titleName: string
  grade: BuybackGrade
  buyPrice: number
  expectedSellingPrice: number
  barcodePreview: string
  needsApproval: boolean
}

export type BuybackIsbnLookupResult = {
  editionId: string
  titleId: string
  titleName: string
  author?: string | null
  publisher?: string | null
  publishYear?: number | null
  isbn?: string | null
  coverPrice: number
  gradeAMinPrice: number
  gradeAMaxPrice: number
  gradeBMinPrice: number
  gradeBMaxPrice: number
  gradeCMinPrice: number
  gradeCMaxPrice: number
  gradeDMinPrice: number
  gradeDMaxPrice: number
}

export type CustomerBuybackLineDto = {
  id: string
  editionId: string
  titleName: string
  isbn?: string | null
  conditionGrade: BuybackGrade
  coverPrice: number
  agreedBuyPrice: number
  expectedSellingPrice: number
  quantity: number
  overSingleLimit: boolean
  barcodes: string[]
  copyStatus?: string | null
}

export type CustomerBuybackDetailDto = {
  id: string
  code: string
  sellerId?: string | null
  sellerName: string
  sellerPhone: string
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'
  needsApproval: boolean
  totalAmount: number
  totalCopies: number
  generatedCopyCount: number
  payoutMethod: BuybackPayoutMethod
  paymentNo?: string | null
  cashDrawerBefore: number
  cashDrawerAfter: number
  note?: string | null
  createdBy: string
  createdByName: string
  createdAt: string
  approvedBy?: string | null
  approvedByName?: string | null
  approvedAt?: string | null
  completedAt?: string | null
  lines: CustomerBuybackLineDto[]
}

export const SINGLE_ITEM_APPROVAL_LIMIT = 200000
export const SLIP_TOTAL_APPROVAL_LIMIT = 1000000
export const CASH_DRAWER_BEFORE = 6065000

export const GRADE_OPTIONS: SelectOption<BuybackGrade>[] = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
]

export const EXCEED_REASON_OPTIONS: SelectOption<string>[] = [
  {
    value: 'Bộ đặc biệt đủ bìa áo, chất lượng tốt, nhu cầu cao.',
    label: 'Bộ đặc biệt đủ bìa áo, chất lượng tốt, nhu cầu cao.',
  },
  {
    value: 'Ấn bản giới hạn đã ngừng in, nhiều khách hỏi thuê.',
    label: 'Ấn bản giới hạn đã ngừng in, nhiều khách hỏi thuê.',
  },
  {
    value: 'Trọn bộ đủ tập không khuyết, tiết kiệm chi phí săn lẻ.',
    label: 'Trọn bộ đủ tập không khuyết, tiết kiệm chi phí săn lẻ.',
  },
]

export const GRADE_META: Record<
  BuybackGrade,
  { badgeLabel: string; minPct: number; maxPct: number; defaultPct: number }
> = {
  A: { badgeLabel: '[A] 90–99%', minPct: 0.6, maxPct: 0.7, defaultPct: 0.65 },
  B: { badgeLabel: '[B] 70–89%', minPct: 0.5, maxPct: 0.6, defaultPct: 0.55 },
  C: { badgeLabel: '[C] 50–69%', minPct: 0.3, maxPct: 0.45, defaultPct: 0.4 },
  D: { badgeLabel: '[D] <50%', minPct: 0.15, maxPct: 0.25, defaultPct: 0.2 },
}
