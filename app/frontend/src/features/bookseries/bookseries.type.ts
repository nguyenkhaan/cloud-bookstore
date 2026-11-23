import type { components } from '@/contract/api-contract'
export type {
  CloudinaryUploadResponse,
  CloudinaryUploadResultRequest,
  UploadedImage,
  UploadOwnerType,
  UploadSignatureResponse,
} from '@/features/uploads/upload.type'

export type BookSeriesResponse = components['schemas']['BookSeriesResponse']
export type PagedBookSeriesResponse = components['schemas']['PagedResultOfBookSeriesResponse']
export type CreateBookSeriesRequest = components['schemas']['CreateBookSeriesRequest']
export type BookSeriesListParams = {
  name?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}
