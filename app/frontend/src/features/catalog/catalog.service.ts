import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import { privateClient } from '@/api/client'
import { uploadImage } from '@/features/uploads/upload.service'
import type { UploadedImage } from '@/features/uploads/upload.type'
import {
  fallbackCopies,
  fallbackEditions,
  fallbackSeries,
  fallbackTitles,
  makeFallbackId,
} from './catalog.fixture'
import type {
  BookCopy,
  BookEdition,
  BookSeries,
  BookTitle,
  CreateCopyRequest,
  CreateEditionRequest,
  CreateSeriesRequest,
  SaveTitleRequest,
} from './catalog.type'

type QueryValue = string | number | boolean | null | undefined
type CatalogListResponse<T> = T[] | { items?: T[]; data?: T[]; results?: T[] }
type TitleResponse = BookTitle & { editionsCount?: number; imageUrl?: string | null }
type EditionResponse = BookEdition & { imageUrl?: string | null }
type SeriesResponse = BookSeries & { titlesCount?: number }

const endpoints = {
  copies: '/book-copies',
  editions: '/editions',
  series: '/book-series',
  titles: '/book-titles',
} as const

class CatalogApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'CatalogApiError'
    this.status = status
  }
}

function messageFrom(error: AxiosError<unknown>): string {
  const data = error.response?.data
  if (typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string') {
    return data.message
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

function shouldUseFallback(error: unknown): boolean {
  return error instanceof CatalogApiError && (error.status === 0 || error.status === 404 || error.status === 501)
}

async function requestOrFallback<T>(api: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await api()
  } catch (error) {
    if (shouldUseFallback(error)) return fallback()
    throw error
  }
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

export async function listSeries(search = ''): Promise<BookSeries[]> {
  return requestOrFallback(
    async () => listFrom(await requestData(() => privateClient.get<CatalogListResponse<SeriesResponse>>(endpoints.series, { params: params({ search }) }))).map(seriesForView),
    () => fallbackSeries.filter((series) => series.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())),
  )
}

export async function createSeries(request: CreateSeriesRequest): Promise<BookSeries> {
  return requestOrFallback(
    async () => seriesForView(await requestData(() => privateClient.post<SeriesResponse>(endpoints.series, request))),
    () => {
      const series: BookSeries = { id: makeFallbackId('series'), ...request, isActive: true, titleCount: 0, expectedVolumeCount: null }
      fallbackSeries.unshift(series)
      return series
    },
  )
}

export async function listTitles(filters: { search?: string; seriesId?: string } = {}): Promise<BookTitle[]> {
  return requestOrFallback(
    async () => listFrom(await requestData(() => privateClient.get<CatalogListResponse<TitleResponse>>(endpoints.titles, { params: params(filters) }))).map(titleForView),
    () => fallbackTitles.filter((title) => (
      (!filters.seriesId || title.seriesId === filters.seriesId)
      && (!filters.search || `${title.name} ${title.author ?? ''}`.toLocaleLowerCase().includes(filters.search.toLocaleLowerCase()))
    )),
  )
}

export async function getTitle(titleId: string): Promise<BookTitle> {
  return requestOrFallback(
    async () => titleForView(await requestData(() => privateClient.get<TitleResponse>(`${endpoints.titles}/${encodeURIComponent(titleId)}`))),
    () => {
      const title = fallbackTitles.find((item) => item.id === titleId)
      if (!title) throw new CatalogApiError(404, 'Không tìm thấy đầu sách.')
      return title
    },
  )
}

export async function createTitle(request: SaveTitleRequest): Promise<BookTitle> {
  return requestOrFallback(
    async () => titleForView(await requestData(() => privateClient.post<TitleResponse>(endpoints.titles, request))),
    () => {
      const series = fallbackSeries.find((item) => item.id === request.seriesId)
      const { imageUpload: _imageUpload, ...titleRequest } = request
      const title: BookTitle = {
        id: makeFallbackId('title'),
        ...titleRequest,
        coverImageUrl: null,
        isActive: true,
        seriesName: series?.name ?? null,
        editionCount: 0,
      }
      fallbackTitles.unshift(title)
      if (series) series.titleCount = (series.titleCount ?? 0) + 1
      return title
    },
  )
}

export async function updateTitle(titleId: string, request: SaveTitleRequest): Promise<BookTitle> {
  return requestOrFallback(
    async () => titleForView(await requestData(() => privateClient.put<TitleResponse>(`${endpoints.titles}/${encodeURIComponent(titleId)}`, request))),
    () => {
      const title = fallbackTitles.find((item) => item.id === titleId)
      if (!title) throw new CatalogApiError(404, 'Không tìm thấy đầu sách.')
      const { imageUpload: _imageUpload, ...titleRequest } = request
      Object.assign(title, titleRequest, { seriesName: fallbackSeries.find((series) => series.id === request.seriesId)?.name ?? null })
      return title
    },
  )
}

export async function listEditions(titleId: string): Promise<BookEdition[]> {
  return requestOrFallback(
    async () => listFrom(await requestData(() => privateClient.get<CatalogListResponse<EditionResponse>>(endpoints.editions, { params: { titleId } }))).map(editionForView),
    () => fallbackEditions.filter((edition) => edition.titleId === titleId),
  )
}

export async function getEdition(editionId: string): Promise<BookEdition> {
  return requestOrFallback(
    async () => editionForView(await requestData(() => privateClient.get<EditionResponse>(`${endpoints.editions}/${encodeURIComponent(editionId)}`))),
    () => {
      const edition = fallbackEditions.find((item) => item.id === editionId)
      if (!edition) throw new CatalogApiError(404, 'Không tìm thấy ấn bản.')
      return edition
    },
  )
}

export async function createEdition(request: CreateEditionRequest): Promise<BookEdition> {
  return requestOrFallback(
    async () => editionForView(await requestData(() => privateClient.post<EditionResponse>(endpoints.editions, request))),
    () => {
      const edition: BookEdition = { id: makeFallbackId('edition'), ...request, isActive: true }
      fallbackEditions.unshift(edition)
      const title = fallbackTitles.find((item) => item.id === request.titleId)
      if (title) title.editionCount = (title.editionCount ?? 0) + 1
      return edition
    },
  )
}

export async function listCopies(editionId: string): Promise<BookCopy[]> {
  return requestOrFallback(
    async () => listFrom(await requestData(() => privateClient.get<CatalogListResponse<BookCopy>>(endpoints.copies, { params: { editionId } }))),
    () => fallbackCopies.filter((copy) => copy.editionId === editionId),
  )
}

export async function getCopy(copyId: string): Promise<BookCopy> {
  return requestOrFallback(
    () => requestData(() => privateClient.get<BookCopy>(`${endpoints.copies}/${encodeURIComponent(copyId)}`)),
    () => {
      const copy = fallbackCopies.find((item) => item.id === copyId)
      if (!copy) throw new CatalogApiError(404, 'Không tìm thấy bản vật lý.')
      return copy
    },
  )
}

export async function createCopy(request: CreateCopyRequest): Promise<BookCopy> {
  return requestOrFallback(
    () => requestData(() => privateClient.post<BookCopy>(endpoints.copies, request)),
    () => {
      const copy: BookCopy = { id: makeFallbackId('copy'), ...request, status: 'PENDING_RECEIPT' }
      fallbackCopies.unshift(copy)
      return copy
    },
  )
}

export function uploadBookCover(file: File): Promise<UploadedImage> {
  return uploadImage('TITLE_IMAGE', file)
}
