import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { privateClient } from '@/api/client'
import { ApiError } from '@/features/auth/auth.service'
import type {
  BookSeriesListParams,
  BookSeriesResponse,
  CloudinaryUploadResponse,
  CloudinaryUploadResultRequest,
  CreateBookSeriesRequest,
  PagedBookSeriesResponse,
  UploadedImage,
  UploadOwnerType,
  UploadSignatureResponse,
} from './bookseries.type'

const BOOK_SERIES_ENDPOINT = '/book-series'
const UPLOAD_SIGNATURE_ENDPOINT = '/uploads/signature'

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

// Backend errors come either as { message } (exception handler) or ProblemDetails (model validation).
function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data !== 'object' || data === null) return fallback
  const body = data as Record<string, unknown>
  if (typeof body.message === 'string') return body.message
  if (typeof body.errors === 'object' && body.errors !== null) {
    const first = Object.values(body.errors as Record<string, unknown>).flat()[0]
    if (typeof first === 'string') return first
  }
  if (typeof body.detail === 'string') return body.detail
  if (typeof body.title === 'string') return body.title
  return fallback
}

async function requestData<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
  try {
    return (await request()).data
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error
    throw new ApiError(error.response?.status ?? 0, getErrorMessage(error.response?.data, error.message))
  }
}

export function getBookSeriesList(params: BookSeriesListParams = {}): Promise<PagedBookSeriesResponse> {
  return requestData(() =>
    privateClient.get<PagedBookSeriesResponse>(BOOK_SERIES_ENDPOINT, {
      params: {
        Name: params.name || undefined,
        IsActive: params.isActive,
        Page: params.page,
        PageSize: params.pageSize,
      },
    }),
  )
}

export function createBookSeries(request: CreateBookSeriesRequest): Promise<BookSeriesResponse> {
  return requestData(() => privateClient.post<BookSeriesResponse>(BOOK_SERIES_ENDPOINT, request))
}

export function updateBookSeriesStatus(id: string, isActive: boolean): Promise<BookSeriesResponse> {
  return requestData(() =>
    privateClient.patch<BookSeriesResponse>(`${BOOK_SERIES_ENDPOINT}/${id}/status`, { isActive }),
  )
}

export async function deleteBookSeries(id: string): Promise<void> {
  await requestData(() => privateClient.delete<void>(`${BOOK_SERIES_ENDPOINT}/${id}`))
}

export function replaceBookSeriesImage(
  id: string,
  imageUpload: CloudinaryUploadResultRequest,
): Promise<BookSeriesResponse> {
  return requestData(() =>
    privateClient.put<BookSeriesResponse>(`${BOOK_SERIES_ENDPOINT}/${id}/image`, imageUpload),
  )
}

export async function deleteBookSeriesImage(id: string): Promise<void> {
  await requestData(() => privateClient.delete<void>(`${BOOK_SERIES_ENDPOINT}/${id}/image`))
}

export function requestUploadSignature(ownerType: UploadOwnerType): Promise<UploadSignatureResponse> {
  return requestData(() =>
    privateClient.post<UploadSignatureResponse>(UPLOAD_SIGNATURE_ENDPOINT, { ownerType }),
  )
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.'
  if (file.size > MAX_IMAGE_BYTES) return 'Ảnh tối đa 10 MB.'
  return null
}

// Sends exactly the signed parameter set. Adding or omitting a signed field makes Cloudinary
// answer 401 "Invalid Signature". Uses fetch so no app cookie/CSRF header leaks to Cloudinary.
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
      typeof body === 'object' && body !== null && 'error' in body &&
      typeof (body as { error?: { message?: unknown } }).error?.message === 'string'
        ? (body as { error: { message: string } }).error.message
        : 'Upload lên Cloudinary thất bại.'
    throw new ApiError(response.status, message)
  }
  return body as CloudinaryUploadResponse
}

export async function uploadImage(ownerType: UploadOwnerType, file: File): Promise<UploadedImage> {
  const invalid = validateImageFile(file)
  if (invalid) throw new ApiError(400, invalid)

  // Request the signature right before uploading: it expires ~1 hour after its timestamp.
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
