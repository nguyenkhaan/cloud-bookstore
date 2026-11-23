import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { privateClient } from '@/api/client'
import type {
  CloudinaryUploadResponse,
  UploadedImage,
  UploadOwnerType,
  UploadSignatureResponse,
} from './upload.type'

const UPLOAD_SIGNATURE_ENDPOINT = '/uploads/signature'

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export class UploadError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'UploadError'
    this.status = status
  }
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data !== 'object' || data === null) return fallback
  const body = data as Record<string, unknown>
  if (typeof body.message === 'string') return body.message
  if (typeof body.detail === 'string') return body.detail
  if (typeof body.title === 'string') return body.title
  return fallback
}

async function requestData<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
  try {
    return (await request()).data
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error
    throw new UploadError(error.response?.status ?? 0, getErrorMessage(error.response?.data, error.message))
  }
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.'
  if (file.size > MAX_IMAGE_BYTES) return 'Ảnh tối đa 10 MB.'
  return null
}

export function requestUploadSignature(ownerType: UploadOwnerType): Promise<UploadSignatureResponse> {
  return requestData(() =>
    privateClient.post<UploadSignatureResponse>(UPLOAD_SIGNATURE_ENDPOINT, { ownerType }),
  )
}

export async function uploadToCloudinary(
  signature: UploadSignatureResponse,
  file: File,
): Promise<CloudinaryUploadResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('api_key', signature.apiKey)
  form.append('timestamp', String(signature.timestamp))
  form.append('signature', signature.signature)
  form.append('public_id', signature.publicId)
  form.append('upload_preset', signature.uploadPreset)
  form.append('type', signature.deliveryType)
  form.append('overwrite', String(signature.overwrite))
  if (signature.assetFolder) form.append('asset_folder', signature.assetFolder)

  const response = await fetch(signature.uploadUrl, { method: 'POST', body: form })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
      && typeof (body as { error?: { message?: unknown } }).error?.message === 'string'
        ? (body as { error: { message: string } }).error.message
        : 'Upload lên Cloudinary thất bại.'
    throw new UploadError(response.status, message)
  }

  return body as CloudinaryUploadResponse
}

export async function uploadImage(ownerType: UploadOwnerType, file: File): Promise<UploadedImage> {
  const invalid = validateImageFile(file)
  if (invalid) throw new UploadError(400, invalid)

  const signature = await requestUploadSignature(ownerType)
  const result = await uploadToCloudinary(signature, file)

  return {
    imageUpload: {
      uploadIntentId: signature.uploadIntentId,
      publicId: result.public_id,
      version: result.version,
      signature: result.signature,
      assetId: result.asset_id ?? null,
      format: result.format ?? null,
      bytes: result.bytes ?? null,
    },
    previewUrl: result.secure_url ?? null,
  }
}
