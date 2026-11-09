import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import { privateClient } from '@/api/client'
import { uploadImage } from '@/features/uploads/upload.service'
import type { CloudinaryUploadResultRequest, UploadedImage } from '@/features/uploads/upload.type'
import type {
  BookCopy,
  BookCopyHistoryItem,
  BookCopyLabelResponse,
  AvailableReceiptLine,
  BookEdition,
  BookSeries,
  BookTitle,
  CreateCopyRequest,
  CreateEditionRequest,
  CreateSeriesRequest,
  SaveTitleRequest,
  TitleListFilters,
  UpdateCopyRequest,
  UpdateCopyStatusRequest,
  UpdateEditionRequest,
  UpdateSeriesRequest,
} from './catalog.type'

type QueryValue = string | number | boolean | null | undefined
type CatalogListResponse<T> = T[] | { items?: T[]; data?: T[]; results?: T[] }
type TitleResponse = BookTitle & { editionsCount?: number; imageUrl?: string | null }
type EditionResponse = BookEdition & { imageUrl?: string | null }
type SeriesResponse = BookSeries & { titlesCount?: number; imageUrl?: string | null }
type CopyResponse = BookCopy & { imageUrl?: string | null }

const endpoints = {
  copies: '/book-copies',
  editions: '/editions',
  series: '/book-series',
  titles: '/book-titles',
} as const

export class CatalogApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'CatalogApiError'
    this.status = status
  }
}

function messageFrom(error: AxiosError<unknown>): string {
  const data = error.response?.data
  if (typeof data === 'object' && data !== null) {
    const body = data as Record<string, unknown>
    if (typeof body.message === 'string') return body.message
    if (typeof body.detail === 'string') return body.detail
    if (typeof body.title === 'string') return body.title
  }
  return error.message
}

async function requestData<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
  try {
    return (await request()).data
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error
    throw new CatalogApiError(error.response?.status ?? 0, messageFrom(error))
  }
}

function listFrom<T>(response: CatalogListResponse<T>): T[] {
  if (Array.isArray(response)) return response
  return response.items ?? response.data ?? response.results ?? []
}

function params(input: Record<string, QueryValue>): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(input).filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== null && entry[1] !== ''),
  )
}

function titleForView(title: TitleResponse): BookTitle {
  return {
    ...title,
    coverImageUrl: title.imageUrl ?? title.coverImageUrl ?? null,
    editionCount: title.editionsCount ?? title.editionCount,
  }
}

function editionForView(edition: EditionResponse): BookEdition {
  return { ...edition, coverImageUrl: edition.imageUrl ?? edition.coverImageUrl ?? null }
}

function seriesForView(series: SeriesResponse): BookSeries {
  return { ...series, titleCount: series.titlesCount ?? series.titleCount }
}

function copyForView(copy: CopyResponse): BookCopy {
  return copy
}

// ----------------------------------------------------------------------
// BOOK SERIES APIS
// ----------------------------------------------------------------------

export async function listSeries(search = ''): Promise<BookSeries[]> {
  const response = await requestData(() =>
    privateClient.get<CatalogListResponse<SeriesResponse>>(endpoints.series, { params: params({ Name: search }) }),
  )
  return listFrom(response).map(seriesForView)
}

export async function getSeries(seriesId: string): Promise<BookSeries> {
  const response = await requestData(() =>
    privateClient.get<SeriesResponse>(`${endpoints.series}/${encodeURIComponent(seriesId)}`),
  )
  return seriesForView(response)
}

export async function createSeries(request: CreateSeriesRequest): Promise<BookSeries> {
  const response = await requestData(() =>
    privateClient.post<SeriesResponse>(endpoints.series, request),
  )
  return seriesForView(response)
}

export async function updateSeries(seriesId: string, request: UpdateSeriesRequest): Promise<BookSeries> {
  const response = await requestData(() =>
    privateClient.put<SeriesResponse>(`${endpoints.series}/${encodeURIComponent(seriesId)}`, request),
  )
  return seriesForView(response)
}

export async function updateSeriesStatus(seriesId: string, isActive: boolean): Promise<BookSeries> {
  const response = await requestData(() =>
    privateClient.patch<SeriesResponse>(`${endpoints.series}/${encodeURIComponent(seriesId)}/status`, { isActive }),
  )
  return seriesForView(response)
}

export async function deleteSeries(seriesId: string): Promise<void> {
  await requestData(() =>
    privateClient.delete<void>(`${endpoints.series}/${encodeURIComponent(seriesId)}`),
  )
}

export async function replaceSeriesImage(seriesId: string, imageUpload: CloudinaryUploadResultRequest): Promise<BookSeries> {
  const response = await requestData(() =>
    privateClient.put<SeriesResponse>(`${endpoints.series}/${encodeURIComponent(seriesId)}/image`, imageUpload),
  )
  return seriesForView(response)
}

export async function deleteSeriesImage(seriesId: string): Promise<void> {
  await requestData(() =>
    privateClient.delete<void>(`${endpoints.series}/${encodeURIComponent(seriesId)}/image`),
  )
}

// ----------------------------------------------------------------------
// BOOK TITLES APIS
// ----------------------------------------------------------------------

export async function listTitles(filters: TitleListFilters = {}): Promise<BookTitle[]> {
  const response = await requestData(() =>
    privateClient.get<CatalogListResponse<TitleResponse>>(endpoints.titles, {
      params: params({
        Name: filters.search,
        SeriesId: filters.seriesId,
        CategoryId: filters.categoryId,
        Author: filters.author,
        IsActive: filters.isActive,
      }),
    }),
  )
  return listFrom(response).map(titleForView)
}

export async function getTitle(titleId: string): Promise<BookTitle> {
  const response = await requestData(() =>
    privateClient.get<TitleResponse>(`${endpoints.titles}/${encodeURIComponent(titleId)}`),
  )
  return titleForView(response)
}

export async function createTitle(request: SaveTitleRequest): Promise<BookTitle> {
  const response = await requestData(() =>
    privateClient.post<TitleResponse>(endpoints.titles, request),
  )
  return titleForView(response)
}

export async function updateTitle(titleId: string, request: SaveTitleRequest): Promise<BookTitle> {
  const response = await requestData(() =>
    privateClient.put<TitleResponse>(`${endpoints.titles}/${encodeURIComponent(titleId)}`, request),
  )
  return titleForView(response)
}

export async function updateTitleStatus(titleId: string, isActive: boolean): Promise<BookTitle> {
  const response = await requestData(() =>
    privateClient.patch<TitleResponse>(`${endpoints.titles}/${encodeURIComponent(titleId)}/status`, { isActive }),
  )
  return titleForView(response)
}

export async function deleteTitle(titleId: string): Promise<void> {
  await requestData(() =>
    privateClient.delete<void>(`${endpoints.titles}/${encodeURIComponent(titleId)}`),
  )
}

export async function replaceTitleImage(titleId: string, imageUpload: CloudinaryUploadResultRequest): Promise<BookTitle> {
  const response = await requestData(() =>
    privateClient.put<TitleResponse>(`${endpoints.titles}/${encodeURIComponent(titleId)}/image`, imageUpload),
  )
  return titleForView(response)
}

export async function deleteTitleImage(titleId: string): Promise<void> {
  await requestData(() =>
    privateClient.delete<void>(`${endpoints.titles}/${encodeURIComponent(titleId)}/image`),
  )
}

// ----------------------------------------------------------------------
// EDITIONS APIS
// ----------------------------------------------------------------------

export async function listEditions(titleId: string): Promise<BookEdition[]> {
  const response = await requestData(() =>
    privateClient.get<CatalogListResponse<EditionResponse>>(endpoints.editions, {
      params: params({ TitleId: titleId }),
    }),
  )
  return listFrom(response).map(editionForView)
}

export async function getEdition(editionId: string): Promise<BookEdition> {
  const response = await requestData(() =>
    privateClient.get<EditionResponse>(`${endpoints.editions}/${encodeURIComponent(editionId)}`),
  )
  return editionForView(response)
}

export async function createEdition(request: CreateEditionRequest): Promise<BookEdition> {
  const response = await requestData(() =>
    privateClient.post<EditionResponse>(endpoints.editions, request),
  )
  return editionForView(response)
}

export async function updateEdition(editionId: string, request: UpdateEditionRequest): Promise<BookEdition> {
  const response = await requestData(() =>
    privateClient.put<EditionResponse>(`${endpoints.editions}/${encodeURIComponent(editionId)}`, request),
  )
  return editionForView(response)
}

export async function updateEditionStatus(editionId: string, isActive: boolean): Promise<BookEdition> {
  const response = await requestData(() =>
    privateClient.patch<EditionResponse>(`${endpoints.editions}/${encodeURIComponent(editionId)}/status`, { isActive }),
  )
  return editionForView(response)
}

export async function deleteEdition(editionId: string): Promise<void> {
  await requestData(() =>
    privateClient.delete<void>(`${endpoints.editions}/${encodeURIComponent(editionId)}`),
  )
}

export async function replaceEditionImage(editionId: string, imageUpload: CloudinaryUploadResultRequest): Promise<BookEdition> {
  const response = await requestData(() =>
    privateClient.put<EditionResponse>(`${endpoints.editions}/${encodeURIComponent(editionId)}/image`, imageUpload),
  )
  return editionForView(response)
}

export async function deleteEditionImage(editionId: string): Promise<void> {
  await requestData(() =>
    privateClient.delete<void>(`${endpoints.editions}/${encodeURIComponent(editionId)}/image`),
  )
}

// ----------------------------------------------------------------------
// BOOK COPIES APIS
// ----------------------------------------------------------------------

export async function listCopies(editionId: string): Promise<BookCopy[]> {
  const response = await requestData(() =>
    privateClient.get<CatalogListResponse<CopyResponse>>(endpoints.copies, {
      params: params({ EditionId: editionId }),
    }),
  )
  return listFrom(response).map(copyForView)
}

export async function listAvailableReceiptLines(editionId: string): Promise<AvailableReceiptLine[]> {
  return requestData(() => privateClient.get<AvailableReceiptLine[]>(`${endpoints.copies}/receipt-lines`, { params: { editionId } }))
}

export async function getCopy(copyId: string): Promise<BookCopy> {
  const response = await requestData(() =>
    privateClient.get<CopyResponse>(`${endpoints.copies}/${encodeURIComponent(copyId)}`),
  )
  return copyForView(response)
}

export async function getCopyByBarcode(copyBarcode: string): Promise<BookCopy> {
  const response = await requestData(() =>
    privateClient.get<CopyResponse>(`${endpoints.copies}/by-barcode/${encodeURIComponent(copyBarcode)}`),
  )
  return copyForView(response)
}

export async function getCopyHistory(copyId: string): Promise<BookCopyHistoryItem[]> {
  return await requestData(() =>
    privateClient.get<BookCopyHistoryItem[]>(`${endpoints.copies}/${encodeURIComponent(copyId)}/history`),
  )
}

export async function createCopy(request: CreateCopyRequest): Promise<BookCopy> {
  const response = await requestData(() =>
    privateClient.post<CopyResponse>(endpoints.copies, request),
  )
  return copyForView(response)
}

export async function updateCopy(copyId: string, request: UpdateCopyRequest): Promise<BookCopy> {
  const response = await requestData(() =>
    privateClient.put<CopyResponse>(`${endpoints.copies}/${encodeURIComponent(copyId)}`, request),
  )
  return copyForView(response)
}

export async function deleteCopy(copyId: string): Promise<void> {
  await requestData(() => privateClient.delete<void>(`${endpoints.copies}/${encodeURIComponent(copyId)}`))
}

export async function updateCopyStatus(copyId: string, request: UpdateCopyStatusRequest): Promise<BookCopy> {
  const response = await requestData(() =>
    privateClient.patch<CopyResponse>(`${endpoints.copies}/${encodeURIComponent(copyId)}/status`, request),
  )
  return copyForView(response)
}

export async function createCopyLabel(copyId: string): Promise<BookCopyLabelResponse> {
  return await requestData(() =>
    privateClient.post<BookCopyLabelResponse>(`${endpoints.copies}/${encodeURIComponent(copyId)}/label`),
  )
}

export async function replaceCopyImage(copyId: string, imageUpload: CloudinaryUploadResultRequest): Promise<BookCopy> {
  const response = await requestData(() =>
    privateClient.put<CopyResponse>(`${endpoints.copies}/${encodeURIComponent(copyId)}/image`, imageUpload),
  )
  return copyForView(response)
}

export async function deleteCopyImage(copyId: string): Promise<void> {
  await requestData(() =>
    privateClient.delete<void>(`${endpoints.copies}/${encodeURIComponent(copyId)}/image`),
  )
}

export function uploadBookCover(file: File): Promise<UploadedImage> {
  return uploadImage('TITLE_IMAGE', file)
}
