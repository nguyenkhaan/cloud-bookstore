import type {
  BookCopyFixture,
  CustomerDisplayFixture,
  CustomerFixture,
  DamageReviewFixture,
  PosMockStates,
  QuickSeriesFixture,
  RentalFixture,
  RenewalFixture,
  ReturnFixture,
  SaleFixture,
} from './pos-transaction.type'

export const posMockStates: PosMockStates = {
  empty: 'empty',
  invalid: 'invalid',
  pending: 'pending',
  success: 'success',
  insufficient: 'insufficient',
  damage: 'damage',
}

export const posTabs = [
  { id: 'sale', label: 'Bán hàng', screenCode: 'SCR-POS-02' },
  { id: 'rental', label: 'Cho thuê', screenCode: 'SCR-POS-03' },
  { id: 'renewal', label: 'Gia hạn', screenCode: 'SCR-POS-04' },
  { id: 'return', label: 'Trả & quyết toán', screenCode: 'SCR-POS-05' },
] as const

export const copyFixtures: BookCopyFixture[] = [
  {
    copyBarcode: 'BC-1092',
    title: 'Doraemon',
    volume: 'Tập 01',
    grade: 'A',
    actualSellingPrice: 80000,
    coverPrice: 80000,
    rentalRatePerDay: 2000,
    availability: 'BOTH',
    status: 'AVAILABLE',
  },
  {
    copyBarcode: 'BC-1093',
    title: 'Conan',
    volume: 'Tập 10',
    grade: 'B',
    actualSellingPrice: 100000,
    coverPrice: 100000,
    rentalRatePerDay: 3000,
    availability: 'RENTAL_ONLY',
    status: 'AVAILABLE',
  },
  {
    copyBarcode: 'BC-1094',
    title: 'Nhà giả kim',
    volume: 'Bản đặc biệt',
    grade: 'A',
    actualSellingPrice: 120000,
    coverPrice: 120000,
    rentalRatePerDay: 5000,
    availability: 'SALE_ONLY',
    status: 'AVAILABLE',
  },
  {
    copyBarcode: 'BC-2102',
    title: 'Conan',
    volume: 'Tập 10',
    grade: 'B',
    actualSellingPrice: 100000,
    coverPrice: 100000,
    rentalRatePerDay: 3000,
    availability: 'BOTH',
    status: 'RENTED',
  },
]

export const guestCustomer: CustomerFixture = {
  name: 'Khách vãng lai',
  phone: '',
  tier: 'Thường',
  discountRate: 0,
}

export const memberCustomer: CustomerFixture = {
  name: 'Nguyễn Thu Hà',
  phone: '0909 234 567',
  tier: 'Bạc',
  discountRate: 5,
  identityNumber: '0792 •••• 1234',
  address: '42 Võ Văn Tần, Q.3, TP.HCM',
}

export const saleFixture: SaleFixture = {
  screenCode: 'SCR-POS-02',
  customer: null,
  lines: [
    { ...copyFixtures[0], discountRate: 0, lineTotal: 80000 },
    { ...copyFixtures[1], discountRate: 0, lineTotal: 100000 },
    { ...copyFixtures[2], discountRate: 0, lineTotal: 120000 },
  ],
  paymentMethod: 'cash',
  paymentStatus: 'idle',
  cashReceived: 500000,
  invalidBarcode: 'BC-1202',
}

export const rentalFixture: RentalFixture = {
  screenCode: 'SCR-POS-03',
  customer: memberCustomer,
  lines: [
    { ...copyFixtures[0], rentalDays: 7, rentalFeePreview: 12600, deposit: 80000 },
    { ...copyFixtures[1], rentalDays: 7, rentalFeePreview: 18900, deposit: 100000 },
    { ...copyFixtures[2], rentalDays: 7, rentalFeePreview: 31500, deposit: 120000 },
  ],
  rentalDays: 7,
  paymentMethod: 'cash',
  paymentStatus: 'idle',
}

export const renewalFixture: RenewalFixture = {
  screenCode: 'SCR-POS-04',
  reference: 'RENT-20261008-0041',
  customer: memberCustomer,
  rentalDate: '08/10/2026',
  dueDate: '17/10/2026 · 23:59',
  renewalCount: 1,
  maxRenewals: 2,
  requestedDays: 3,
  maxDaysPerRenewal: 7,
  status: 'active',
  feePreview: 66000,
}

export const returnFixture: ReturnFixture = {
  screenCode: 'SCR-POS-05',
  reference: 'RENT-20261008-0038',
  customer: memberCustomer,
  originalDeposit: 300000,
  lines: [
    { ...copyFixtures[0], returnStatus: 'scanned', lateFee: 0, damageFee: 0, depositDeduction: 0 },
    { ...copyFixtures[1], returnStatus: 'scanned', lateFee: 0, damageFee: 20000, depositDeduction: 20000 },
    { ...copyFixtures[2], returnStatus: 'damage', lateFee: 7500, damageFee: 120000, depositDeduction: 120000 },
  ],
  paymentMethod: 'cash',
  paymentStatus: 'idle',
  insufficientDeposit: false,
}

export const quickSeriesFixture: QuickSeriesFixture = {
  screenCode: 'MOD-POS-01',
  seriesName: 'Thám tử lừng danh Conan',
  publisher: 'NXB Kim Đồng · Đang phát hành',
  totalVolumes: 104,
  selectedVolumes: ['T.01', 'T.02', 'T.05', 'T.10'],
  missingVolumes: ['T.21', 'T.22', 'T.23'],
  grade: 'B',
  proposedPricePerVolume: 18000,
  agreedPricePerVolume: 20000,
  expectedSalePricePerVolume: 35000,
}

export const damageReviewFixture: DamageReviewFixture = {
  screenCode: 'MOD-POS-02',
  reference: 'RENT-20261008-0038 · Nguyễn Thu Hà',
  copy: copyFixtures[3],
  condition: 'Sách bị ngấm nước rách 15 trang giữa',
  illustrativeCompensationRate: 50,
  illustrativeCompensation: 50000,
  approvalPath: 'local-admin',
  note: 'Đồng ý mức khấu trừ, cuốn sách chuyển kho chờ xử lý',
  unresolvedPolicyLabel: 'Tỷ lệ khấu trừ cần được Admin phê duyệt trước khi quyết toán.',
}

export const customerDisplayFixture: CustomerDisplayFixture = {
  screenCode: 'SCR-POS-07',
  requestCode: 'POS-20261018-042',
  customerTier: 'Bạc',
  lines: [
    { title: 'Doraemon', volume: 'Tập 01', quantity: 1, lineTotal: 38000 },
    { title: 'Conan', volume: 'Tập 10', quantity: 1, lineTotal: 42750 },
    { title: 'Nhà giả kim', volume: 'Bản đặc biệt', quantity: 1, lineTotal: 52250 },
  ],
  subtotal: 140000,
  discount: 7000,
  total: 133000,
  paymentStatus: 'pending',
  expiresAt: '15:00',
  bankLabel: 'VCB · NHÀ SÁCH MÂY · •••• 6789',
  paymentReference: 'POS-20261018-042',
}
