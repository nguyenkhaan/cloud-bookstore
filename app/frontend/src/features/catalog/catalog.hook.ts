import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCopy,
  createEdition,
  createSeries,
  createTitle,
  getCopy,
  getEdition,
  getTitle,
  listCopies,
  listEditions,
  listSeries,
  listTitles,
  updateTitle,
} from './catalog.service'
import type { CreateCopyRequest, CreateEditionRequest, CreateSeriesRequest, SaveTitleRequest } from './catalog.type'

export const catalogQueryKeys = {
  copies: (editionId: string) => ['catalog', 'editions', editionId, 'copies'] as const,
  copy: (copyId: string) => ['catalog', 'copies', copyId] as const,
  edition: (editionId: string) => ['catalog', 'editions', editionId] as const,
  editions: (titleId: string) => ['catalog', 'titles', titleId, 'editions'] as const,
  series: (search: string) => ['catalog', 'series', search] as const,
  title: (titleId: string) => ['catalog', 'titles', titleId] as const,
  titles: (filters: { search?: string; seriesId?: string }) => ['catalog', 'titles', filters] as const,
}

export function useSeriesQuery(search = '') {
  return useQuery({ queryKey: catalogQueryKeys.series(search), queryFn: () => listSeries(search) })
}

export function useTitlesQuery(filters: { search?: string; seriesId?: string } = {}) {
  return useQuery({ queryKey: catalogQueryKeys.titles(filters), queryFn: () => listTitles(filters) })
}

export function useTitleQuery(titleId: string) {
  return useQuery({ queryKey: catalogQueryKeys.title(titleId), queryFn: () => getTitle(titleId), enabled: Boolean(titleId) })
}

export function useEditionsQuery(titleId: string) {
  return useQuery({ queryKey: catalogQueryKeys.editions(titleId), queryFn: () => listEditions(titleId), enabled: Boolean(titleId) })
}

export function useEditionQuery(editionId: string) {
  return useQuery({ queryKey: catalogQueryKeys.edition(editionId), queryFn: () => getEdition(editionId), enabled: Boolean(editionId) })
}

export function useCopiesQuery(editionId: string) {
  return useQuery({ queryKey: catalogQueryKeys.copies(editionId), queryFn: () => listCopies(editionId), enabled: Boolean(editionId) })
}

export function useCopyQuery(copyId: string) {
  return useQuery({ queryKey: catalogQueryKeys.copy(copyId), queryFn: () => getCopy(copyId), enabled: Boolean(copyId) })
}

export function useCreateSeriesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateSeriesRequest) => createSeries(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'series'] }),
  })
}

export function useCreateTitleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: SaveTitleRequest) => createTitle(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  })
}

export function useUpdateTitleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ titleId, request }: { titleId: string; request: SaveTitleRequest }) => updateTitle(titleId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  })
}

export function useCreateEditionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateEditionRequest) => createEdition(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  })
}

export function useCreateCopyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateCopyRequest) => createCopy(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  })
}
