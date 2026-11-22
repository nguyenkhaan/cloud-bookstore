import type { CloudinaryUploadResultRequest } from '@/features/uploads/upload.type'
import type { components } from '@/contract/api-contract'

export type CatalogStatus = 'ACTIVE' | 'INACTIVE'
export type CopyStatus = 'PENDING_RECEIPT' | 'AVAILABLE' | 'RENTED' | 'SOLD' | 'INVENTORY_LOCKED' | 'DAMAGED' | 'LOST' | 'DISPOSED' | 'DISCONTINUED'
export type CopyAvailability = 'BOTH' | 'SALE_ONLY' | 'RENTAL_ONLY'
export type ConditionGrade = 'A' | 'B' | 'C' | 'D'

export type BookCategory = {
  id: string
  parentId: string | null
  parentName?: string | null
  name: string
  isActive: boolean
}

export type BookCategoryDetail = BookCategory & {
  subCategories: BookCategory[]
}

export type CreateCategoryRequest = {
  name: string
  parentId?: string | null
  isActive?: boolean
}

export type UpdateCategoryRequest = {
  name: string
  parentId?: string | null
  isActive?: boolean
}

export type SupplierItem = {
  id: string
  code: string
  name: string
  phone: string | null
  address: string | null
  taxCode: string | null
  isActive: boolean
  receiptCount: number
  totalImportAmount: number
  pendingAmount: number
  pendingReceiptCount: number
}

export type SupplierStats = {
  activeCount: number
  inactiveCount: number
  totalCount: number
  totalImportAmount: number
  totalPendingAmount: number
  pendingReceiptCount: number
}

export type SupplierListFilters = {
  search?: string
  isActive?: boolean
  hasPending?: boolean
  page?: number
  pageSize?: number
}

export type CreateSupplierRequest = {
  name: string
  phone?: string | null
  address?: string | null
  taxCode?: string | null
  isActive?: boolean
}

export type UpdateSupplierRequest = {
  name: string
  phone?: string | null
  address?: string | null
  taxCode?: string | null
  isActive?: boolean
}

export type BookSeriesTitleSummary = {
  id: string
  name: string
  volumeLabel?: string | null
  author?: string | null
  originalPublishYear?: number | null
  isActive: boolean
  imageUrl?: string | null
}

export type BookSeries = {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isActive: boolean
  titleCount?: number
  expectedVolumeCount?: number | null
  titles?: BookSeriesTitleSummary[]
}

export type BookTitle = {
  id: string
  seriesId: string | null
  categoryId?: string | null
  categoryName?: string | null
  name: string
  volumeLabel: string | null
  author: string | null
  description: string | null
  coverImageUrl: string | null
  isActive: boolean
  seriesName?: string | null
  editionCount?: number
}

export type BookEdition = {
  id: string
  titleId: string
  isbn: string | null
  editionStatement: string | null
  printingStatement: string | null
  format: string | null
  publisher: string | null
  publishYear: number | null
  coverPrice: number
  minStockSale?: number
  minStockRental?: number
  coverImageUrl: string | null
  isActive: boolean
}

export type BookCopy = {
  id: string
  editionId: string
  copyBarcode: string
  availability: CopyAvailability
  status: CopyStatus
  conditionGrade: ConditionGrade
  conditionNote: string | null
  costPrice?: number | null
  sellingPrice: number | null
  rentalRate: number | null
  shelfCode: string | null
  imageUrl?: string | null
  editionImageUrl?: string | null
  receiptLineId?: string
  titleName?: string | null
  volumeLabel?: string | null
  editionStatement?: string | null
  publishYear?: number | null
}

export type CreateSeriesRequest = Pick<BookSeries, 'name' | 'description'> & {
  expectedVolumeCount?: number | null
  imageUpload?: CloudinaryUploadResultRequest | null
}
export type UpdateSeriesRequest = Pick<components['schemas']['UpdateBookSeriesRequest'], 'name' | 'description'>

export type SaveTitleRequest = Pick<BookTitle, 'name' | 'seriesId' | 'volumeLabel' | 'author' | 'description'> & {
  imageUpload?: CloudinaryUploadResultRequest | null
}
export type CreateTitleRequest = SaveTitleRequest
export type UpdateTitleRequest = SaveTitleRequest

export type CreateEditionRequest = Pick<BookEdition, 'titleId' | 'isbn' | 'editionStatement' | 'printingStatement' | 'format' | 'publisher' | 'publishYear' | 'coverPrice'> & {
  imageUpload?: CloudinaryUploadResultRequest | null
}
export type UpdateEditionRequest = {
  isbn?: string | null
  editionStatement?: string | null
  printingStatement?: string | null
  publisher?: string | null
  publishYear?: number | null
  format?: string | null
  coverPrice?: number
  minStockSale?: number
  minStockRental?: number
  isActive?: boolean
  imageUpload?: CloudinaryUploadResultRequest | null
}

export type CreateCopyRequest = Pick<BookCopy, 'editionId' | 'availability' | 'conditionGrade' | 'conditionNote' | 'sellingPrice' | 'rentalRate' | 'shelfCode'> & {
  receiptLineId: string
  imageUpload?: CloudinaryUploadResultRequest | null
}
export type UpdateCopyRequest = {
  conditionGrade: ConditionGrade
  conditionNote?: string | null
  sellingPrice?: number | null
  rentalRate?: number | null
  shelfCode?: string | null
  availability: CopyAvailability
  reason: string
  imageUpload?: CloudinaryUploadResultRequest | null
}

export type AvailableReceiptLine = {
  id: string
  receiptCode: string
  remainingQuantity: number
  conditionGrade: ConditionGrade
  availability: CopyAvailability
}

export type UpdateStatusRequest = {
  isActive: boolean
}

export type UpdateCopyStatusRequest = {
  status: CopyStatus
  reason: string
}

export type UpdateCopyShelfRequest = {
  shelfCode?: string | null
  reason: string
}

export type BookCopyHistoryMetadata = {
  costPrice?: number | null
  supplierName?: string | null
  customerName?: string | null
  depositAmount?: number | null
  copyCondition?: string | null
  refundAmount?: number | null
  additionalAmountDue?: number | null
  shelfCode?: string | null
  sellingPrice?: number | null
  returnStatus?: string | null
}

export type BookCopyHistoryItem = {
  occurredAt: string
  source: string
  eventType: string
  summary: string
  referenceId?: string | null
  referenceCode?: string | null
  actorId?: string | null
  actorName?: string | null
  beforeData?: string | null
  afterData?: string | null
  reason?: string | null
  metadata?: BookCopyHistoryMetadata | null
}

export type BookCopyLabelResponse = {
  copyId: string
  copyBarcode: string
  isbn?: string | null
  titleName: string
  volumeLabel?: string | null
  seriesName?: string | null
  author?: string | null
  publisher?: string | null
  publishYear?: number | null
  conditionGrade: ConditionGrade
  availability: CopyAvailability
  sellingPrice?: number | null
  rentalRate?: number | null
  shelfCode?: string | null
  isReprint: boolean
  printCount: number
  generatedAt: string
}

export type TitleListFilters = {
  search?: string
  seriesId?: string
  categoryId?: string
  author?: string
  isActive?: boolean
}

export type StockReceiptStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'

export type StockReceiptSourceType = 'SUPPLIER' | 'CUSTOMER_BUYBACK'

export type StockReceiptSummary = {
  id: string
  code: string
  sourceType: StockReceiptSourceType
  supplierId?: string | null
  supplierCode?: string | null
  supplierName?: string | null
  status: StockReceiptStatus
  totalAmount: number
  lineCount: number
  totalCopies: number
  generatedCopyCount: number
  note?: string | null
  createdBy: string
  createdByName?: string | null
  createdAt: string
  completedAt?: string | null
}

export type StockReceiptLineItem = {
  id: string
  editionId: string
  titleId: string
  titleName: string
  volumeLabel?: string | null
  isbn?: string | null
  publisher?: string | null
  publishYear?: number | null
  editionStatement?: string | null
  format?: string | null
  coverPrice: number
  quantity: number
  unitCost: number
  conditionGrade: ConditionGrade
  conditionNote?: string | null
  availability: CopyAvailability
  sellingPrice?: number | null
  rentalRate?: number | null
  generatedCopyCount: number
  firstBarcode?: string | null
  lastBarcode?: string | null
  barcodes: string[]
  copyStatus?: CopyStatus | null
}

export type StockReceiptDetail = StockReceiptSummary & {
  lines: StockReceiptLineItem[]
}

export type StockReceiptListFilters = {
  search?: string
  supplierId?: string
  status?: StockReceiptStatus
  sourceType?: StockReceiptSourceType
  page?: number
  pageSize?: number
}

export type CreateStockReceiptLineRequest = {
  editionId: string
  quantity: number
  unitCost: number
  conditionGrade?: ConditionGrade
  availability?: CopyAvailability
  conditionNote?: string | null
}

export type CreateStockReceiptRequest = {
  supplierId: string
  note?: string | null
  lines: CreateStockReceiptLineRequest[]
}

export type UpdateStockReceiptRequest = CreateStockReceiptRequest

export type CompleteStockReceiptLinePricingRequest = {
  lineId?: string | null
  editionId?: string | null
  sellingPrice?: number | null
  rentalRate?: number | null
  availability?: CopyAvailability | null
  shelfCode?: string | null
}

export type CompleteStockReceiptRequest = {
  activateImmediately?: boolean
  note?: string | null
  lines?: CompleteStockReceiptLinePricingRequest[]
}

export type ActivateStockReceiptCopiesRequest = {
  lines?: CompleteStockReceiptLinePricingRequest[]
}

export type EditionStockAlertItem = {
  editionId: string
  titleId: string
  titleName: string
  volumeLabel?: string | null
  editionStatement?: string | null
  isbn?: string | null
  publisher?: string | null
  publishYear?: number | null
  coverPrice: number
  minStockSale: number
  minStockRental: number
  availableSale: number
  availableRental: number
  rentedCount: number
  totalPhysical: number
  pendingImportCount: number
  saleDeficit: number
  rentalDeficit: number
  suggestedRestockCount: number
  isSaleLow: boolean
  isRentalLow: boolean
  severity: string
  severityLabel: string
  suggestionText: string
  preferredSupplierId?: string | null
  preferredSupplierCode?: string | null
  preferredSupplierName?: string | null
}

export type EditionStockAlertDashboard = {
  alertEditionCount: number
  rentalLowEditionCount: number
  pendingImportCopiesCount: number
  pendingImportEditionCount: number
  latestPendingReceiptCode?: string | null
  totalSuggestedRestockCount: number
  items: EditionStockAlertItem[]
}

export type EditionStockAlertFilters = {
  search?: string
  channel?: string
  severity?: string
  supplierId?: string
  onlyAlerts?: boolean
}

export type UpdateEditionThresholdsRequest = {
  minStockSale: number
  minStockRental: number
}

export type StockOutType =
  | 'DISPOSAL_DAMAGED'
  | 'DISCONTINUED_CIRCULATION'
  | 'LOST_WRITE_OFF'
  | 'RETURN_SUPPLIER'

export type StockOutLineRequest = {
  copyBarcode: string
  lineReason?: string | null
}

export type CreateStockOutRequest = {
  stockOutType: StockOutType
  reason: string
  evidenceFileName?: string | null
  lines: StockOutLineRequest[]
}

export type StockOutLineItem = {
  copyId: string
  copyBarcode: string
  titleName: string
  conditionGrade: string
  conditionNote?: string | null
  costPrice: number
  currentStatus: string
  targetStatus: string
  lineReason?: string | null
}

export type StockOutHistoryItem = {
  id: string
  occurredAt: string
  actorId?: string | null
  actorName: string
  action: string
  note?: string | null
}

export type StockOutDetail = {
  id: string
  code: string
  stockOutType: StockOutType
  stockOutTypeLabel: string
  status: StockReceiptStatus
  reason: string
  evidenceFileName?: string | null
  copyCount: number
  totalCost: number
  createdBy: string
  createdByName: string
  createdAt: string
  approvedBy?: string | null
  approvedByName?: string | null
  approvedAt?: string | null
  lines: StockOutLineItem[]
  history: StockOutHistoryItem[]
}

export type StockOutListFilters = {
  search?: string
  status?: StockReceiptStatus
  page?: number
  pageSize?: number
}
