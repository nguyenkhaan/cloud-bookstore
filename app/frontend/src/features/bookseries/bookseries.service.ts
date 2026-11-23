import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { privateClient } from '@/api/client'
import { ApiError } from '@/features/auth/auth.service'
import { ALLOWED_IMAGE_TYPES, uploadImage, validateImageFile } from '@/features/uploads/upload.service'
import type { CloudinaryUploadResultRequest } from '@/features/uploads/upload.type'
import type {
  BookSeriesListParams,
  BookSeriesResponse,
  CreateBookSeriesRequest,
  PagedBookSeriesResponse,
} from './bookseries.type'

const BOOK_SERIES_ENDPOINT = '/book-series'

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

export { ALLOWED_IMAGE_TYPES, uploadImage, validateImageFile }
