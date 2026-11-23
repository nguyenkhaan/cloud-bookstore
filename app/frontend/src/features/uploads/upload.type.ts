import type { components } from '@/contract/api-contract'

export type CloudinaryUploadResultRequest = components['schemas']['CloudinaryUploadResultRequest']
export type UploadSignatureResponse = components['schemas']['UploadSignatureResponse']
export type UploadOwnerType = NonNullable<components['schemas']['UploadOwnerType']>

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
  previewUrl: string | null
}
