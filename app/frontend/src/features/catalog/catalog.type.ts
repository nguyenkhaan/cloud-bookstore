import type { CloudinaryUploadResultRequest } from '@/features/uploads/upload.type'
import type { components } from '@/contract/api-contract'

export type CatalogStatus = 'ACTIVE' | 'INACTIVE'
export type CopyStatus = 'PENDING_RECEIPT' | 'AVAILABLE' | 'RENTED' | 'SOLD' | 'INVENTORY_LOCKED' | 'DAMAGED' | 'LOST' | 'DISPOSED' | 'DISCONTINUED'
export type CopyAvailability = 'BOTH' | 'SALE_ONLY' | 'RENTAL_ONLY'
export type ConditionGrade = 'A' | 'B' | 'C' | 'D'

export type BookSeries = {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isActive: boolean
  titleCount?: number
  expectedVolumeCount?: number | null
}

export type BookTitle = {
  id: string
  seriesId: string | null
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
  sellingPrice: number | null
  rentalRate: number | null
  shelfCode: string | null
  imageUrl?: string | null
  editionImageUrl?: string | null
  receiptLineId?: string
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
