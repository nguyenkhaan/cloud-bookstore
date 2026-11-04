import type { CloudinaryUploadResultRequest } from '@/features/uploads/upload.type'

export type CatalogStatus = 'ACTIVE' | 'INACTIVE'
export type CopyStatus = 'PENDING_RECEIPT' | 'AVAILABLE' | 'RENTED' | 'SOLD' | 'DAMAGED'
export type CopyAvailability = 'BOTH' | 'SALE_ONLY' | 'RENTAL_ONLY'
export type ConditionGrade = 'A' | 'B' | 'C' | 'D'

export type BookSeries = {
  id: string
  name: string
  description: string | null
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
}

export type CreateSeriesRequest = Pick<BookSeries, 'name' | 'description'>
export type SaveTitleRequest = Pick<BookTitle, 'name' | 'seriesId' | 'volumeLabel' | 'author' | 'description'> & {
  imageUpload: CloudinaryUploadResultRequest | null
}
export type CreateEditionRequest = Pick<BookEdition, 'titleId' | 'isbn' | 'editionStatement' | 'printingStatement' | 'format' | 'publisher' | 'publishYear' | 'coverPrice' | 'coverImageUrl'>
export type CreateCopyRequest = Pick<BookCopy, 'editionId' | 'copyBarcode' | 'availability' | 'conditionGrade' | 'conditionNote' | 'sellingPrice' | 'rentalRate' | 'shelfCode'>
