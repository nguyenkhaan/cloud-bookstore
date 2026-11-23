import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBookSeries,
  deleteBookSeries,
  deleteBookSeriesImage,
  getBookSeriesList,
  replaceBookSeriesImage,
  updateBookSeriesStatus,
  uploadImage,
} from './bookseries.service'
import type { BookSeriesListParams, CreateBookSeriesRequest } from './bookseries.type'

export const bookSeriesKeys = {
  all: ['book-series'] as const,
  list: (params: BookSeriesListParams) => [...bookSeriesKeys.all, 'list', params] as const,
}

function useInvalidateBookSeries() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: bookSeriesKeys.all })
}

export function useBookSeriesListQuery(params: BookSeriesListParams = {}) {
  return useQuery({
    queryKey: bookSeriesKeys.list(params),
    queryFn: () => getBookSeriesList(params),
  })
}

export function useCreateBookSeriesMutation() {
  const invalidate = useInvalidateBookSeries()
  return useMutation({
    mutationKey: [...bookSeriesKeys.all, 'create'],
    mutationFn: (request: CreateBookSeriesRequest) => createBookSeries(request),
    onSuccess: invalidate,
  })
}

export function useUploadBookSeriesImageMutation() {
  return useMutation({
    mutationKey: [...bookSeriesKeys.all, 'upload-image'],
    mutationFn: (file: File) => uploadImage('BOOK_SERIES_IMAGE', file),
  })
}

// Uploads a new asset under a fresh intent, then attaches it; the backend destroys the old asset after commit.
export function useReplaceBookSeriesImageMutation() {
  const invalidate = useInvalidateBookSeries()
  return useMutation({
    mutationKey: [...bookSeriesKeys.all, 'replace-image'],
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const { imageUpload } = await uploadImage('BOOK_SERIES_IMAGE', file)
      return replaceBookSeriesImage(id, imageUpload)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteBookSeriesImageMutation() {
  const invalidate = useInvalidateBookSeries()
  return useMutation({
    mutationKey: [...bookSeriesKeys.all, 'delete-image'],
    mutationFn: (id: string) => deleteBookSeriesImage(id),
    onSuccess: invalidate,
  })
}

export function useUpdateBookSeriesStatusMutation() {
  const invalidate = useInvalidateBookSeries()
  return useMutation({
    mutationKey: [...bookSeriesKeys.all, 'update-status'],
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateBookSeriesStatus(id, isActive),
    onSuccess: invalidate,
  })
}

export function useDeleteBookSeriesMutation() {
  const invalidate = useInvalidateBookSeries()
  return useMutation({
    mutationKey: [...bookSeriesKeys.all, 'delete'],
    mutationFn: (id: string) => deleteBookSeries(id),
    onSuccess: invalidate,
  })
}
