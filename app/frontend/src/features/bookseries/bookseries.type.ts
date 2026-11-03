import type { components } from '@/contract/api-contract'

export type BookSeriesResponse = components['schemas']['BookSeriesResponse']
export type PagedBookSeriesResponse = components['schemas']['PagedResultOfBookSeriesResponse']
export type CreateBookSeriesRequest = components['schemas']['CreateBookSeriesRequest']
export type CloudinaryUploadResultRequest = components['schemas']['CloudinaryUploadResultRequest']
export type UploadSignatureResponse = components['schemas']['UploadSignatureResponse']

export type UploadOwnerType = NonNullable<components['schemas']['UploadOwnerType']>

export type BookSeriesListParams = {
  name?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}

// Subset of the JSON body Cloudinary returns from a successful upload.
export type CloudinaryUploadResponse = {
  public_id: string
  version: number
  signature: string
  asset_id?: string
  format?: string
  bytes?: number
  secure_url?: string
}

export type UploadedImage = {
  imageUpload: CloudinaryUploadResultRequest
  // Only for previewing the just-uploaded file; the list always renders the backend imageUrl.
  previewUrl: string | null
}
