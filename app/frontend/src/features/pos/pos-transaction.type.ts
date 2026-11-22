export type PosTab = 'sale' | 'rental' | 'renewal' | 'return'

export type PaymentMethod = 'cash' | 'vietqr'
export type PaymentStatus = 'idle' | 'pending' | 'success' | 'error'
export type CopyAvailability = 'BOTH' | 'SALE_ONLY' | 'RENTAL_ONLY'
export type CopyStatus = 'AVAILABLE' | 'RENTED' | 'SOLD' | 'INVENTORY_LOCKED' | 'DAMAGED'
export type MemberTier = 'Thường' | 'Bạc' | 'Vàng'
export type DamageApprovalPath = 'local-admin' | 'remote-admin'

export interface BookCopyFixture {
  copyBarcode: string
  title: string
  volume: string
  grade: 'A' | 'B' | 'C' | 'D'
  actualSellingPrice: number
  coverPrice: number
  rentalRatePerDay: number
  availability: CopyAvailability
  status: CopyStatus
}

export interface CustomerFixture {
  name: string
  phone: string
  tier: MemberTier
  discountRate: number
  identityNumber?: string
  address?: string
}

export interface SaleLineFixture extends BookCopyFixture {
  discountRate: number
  lineTotal: number
}

export interface RentalLineFixture extends BookCopyFixture {
  rentalDays: number
  rentalFeePreview: number
  deposit: number
}

export interface SaleFixture {
  customer: CustomerFixture | null
  lines: SaleLineFixture[]
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  cashReceived: number
  invalidBarcode: string
}

export interface RentalFixture {
  customer: CustomerFixture
  lines: RentalLineFixture[]
  rentalDays: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  blockedReason?: string
}

export interface RenewalFixture {
  reference: string
  customer: CustomerFixture
  rentalDate: string
  dueDate: string
  renewalCount: number
  maxRenewals: number
  requestedDays: number
  maxDaysPerRenewal: number
  status: 'active' | 'overdue' | 'blocked' | 'max-renewals'
  feePreview: number
}

export interface ReturnLineFixture extends BookCopyFixture {
  returnStatus: 'scanned' | 'waiting' | 'missing' | 'damage'
  lateFee: number
  damageFee: number
  depositDeduction: number
}

export interface ReturnFixture {
  reference: string
  customer: CustomerFixture
  originalDeposit: number
  lines: ReturnLineFixture[]
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  insufficientDeposit: boolean
}

export interface QuickSeriesFixture {
  seriesName: string
  publisher: string
  totalVolumes: number
  selectedVolumes: string[]
  missingVolumes: string[]
  grade: 'A' | 'B' | 'C' | 'D'
  proposedPricePerVolume: number
  agreedPricePerVolume: number
  expectedSalePricePerVolume: number
}

export interface DamageReviewFixture {
  reference: string
  copy: BookCopyFixture
  condition: string
  illustrativeCompensationRate: number
  illustrativeCompensation: number
  approvalPath: DamageApprovalPath
  note: string
  unresolvedPolicyLabel: string
}

export interface CustomerDisplayLine {
  title: string
  volume: string
  quantity: number
  lineTotal: number
}

export interface CustomerDisplayFixture {
  requestCode: string
  customerTier: MemberTier
  lines: CustomerDisplayLine[]
  subtotal: number
  discount: number
  total: number
  paymentStatus: PaymentStatus
  expiresAt: string
  bankLabel: string
  paymentReference: string
}

export interface PosMockStates {
  empty: 'empty'
  invalid: 'invalid'
  pending: 'pending'
  success: 'success'
  insufficient: 'insufficient'
  damage: 'damage'
}
