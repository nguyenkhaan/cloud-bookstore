import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMatch, useSearchParams } from 'react-router-dom'
import type { BreadcrumbItem } from '@/components/common/Breadcrumb'
import {
  createCopy,
  createCopyLabel,
  createEdition,
  createSeries,
  createTitle,
  deleteCopyImage,
  deleteEdition,
  deleteEditionImage,
  deleteSeries,
  deleteSeriesImage,
  deleteTitle,
  deleteTitleImage,
  getCopy,
  getCopyByBarcode,
  getCopyHistory,
  getEdition,
  getSeries,
  getTitle,
  listCopies,
  listEditions,
  listSeries,
  listTitles,
  replaceCopyImage,
  replaceEditionImage,
  replaceSeriesImage,
  replaceTitleImage,
  updateCopy,
  updateCopyStatus,
  updateEdition,
  updateEditionStatus,
  updateSeries,
  updateSeriesStatus,
  updateTitle,
  updateTitleStatus,
} from './catalog.service'
import { catalogPaths } from './catalog.route'
import type {
  BookEdition,
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
import type { CloudinaryUploadResultRequest } from '@/features/uploads/upload.type'

export const catalogQueryKeys = {
  all: ['catalog'] as const,
  copies: (editionId: string) => ['catalog', 'editions', editionId, 'copies'] as const,
  copy: (copyId: string) => ['catalog', 'copies', copyId] as const,
  copyByBarcode: (barcode: string) => ['catalog', 'copies', 'by-barcode', barcode] as const,
  copyHistory: (copyId: string) => ['catalog', 'copies', copyId, 'history'] as const,
  edition: (editionId: string) => ['catalog', 'editions', editionId] as const,
  editions: (titleId: string) => ['catalog', 'titles', titleId, 'editions'] as const,
  series: (search: string) => ['catalog', 'series', search] as const,
  seriesDetail: (seriesId: string) => ['catalog', 'series', 'detail', seriesId] as const,
  title: (titleId: string) => ['catalog', 'titles', titleId] as const,
  titles: (filters: TitleListFilters = {}) => ['catalog', 'titles', filters] as const,
}

// ----------------------------------------------------------------------
// QUERY HOOKS
// ----------------------------------------------------------------------

export function useSeriesQuery(search = '') {
  return useQuery({ queryKey: catalogQueryKeys.series(search), queryFn: () => listSeries(search) })
}

export function useSeriesDetailQuery(seriesId: string) {
  return useQuery({
    queryKey: catalogQueryKeys.seriesDetail(seriesId),
    queryFn: () => getSeries(seriesId),
    enabled: Boolean(seriesId),
  })
}

export function useTitlesQuery(filters: TitleListFilters = {}) {
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

export function useCopyByBarcodeQuery(barcode: string) {
  return useQuery({
    queryKey: catalogQueryKeys.copyByBarcode(barcode),
    queryFn: () => getCopyByBarcode(barcode),
    enabled: Boolean(barcode),
  })
}

export function useCopyHistoryQuery(copyId: string) {
  return useQuery({
    queryKey: catalogQueryKeys.copyHistory(copyId),
    queryFn: () => getCopyHistory(copyId),
    enabled: Boolean(copyId),
  })
}

// ----------------------------------------------------------------------
// BREADCRUMBS
// ----------------------------------------------------------------------

const CATALOG_ROOT_LABEL = 'Kho & đầu sách'

function seriesLabel(name?: string | null) {
  return name ? `Bộ sách ${name}` : 'Bộ sách'
}

function editionLabel(edition?: Pick<BookEdition, 'editionStatement' | 'isbn'>) {
  if (edition?.editionStatement) return edition.editionStatement
  if (edition?.isbn) return `ISBN ${edition.isbn}`
  return 'Ấn bản'
}

/**
 * Builds the header breadcrumb for the current catalog route:
 * Kho & đầu sách › Bộ sách X › Đầu sách › Ấn bản › CopyBarcode.
 * Parents are resolved up the Copy → Edition → Title → Series chain and share the
 * react-query cache with the pages, so no extra requests are made.
 */
export function useCatalogBreadcrumbs(): BreadcrumbItem[] {
  const [searchParams] = useSearchParams()
  const isTitleList = Boolean(useMatch(catalogPaths.titleList))
  const titleMatch = useMatch('/catalog/titles/:titleId')
  const editionMatch = useMatch('/catalog/editions/:editionId')
  const copyMatch = useMatch('/catalog/copies/:copyId')

  const listSeriesId = isTitleList ? searchParams.get('seriesId') ?? '' : ''
  const seriesDetailQuery = useSeriesDetailQuery(listSeriesId)

  const copyQuery = useCopyQuery(copyMatch?.params.copyId ?? '')
  const editionId = editionMatch?.params.editionId ?? copyQuery.data?.editionId ?? ''
  const editionQuery = useEditionQuery(editionId)
  const titleId = titleMatch?.params.titleId ?? editionQuery.data?.titleId ?? ''
  const titleQuery = useTitleQuery(titleId)
  const title = titleQuery.data

  const root: BreadcrumbItem = { label: CATALOG_ROOT_LABEL, to: catalogPaths.seriesList }

  if (isTitleList) {
    return [
      root,
      listSeriesId
          ? { label: seriesLabel(seriesDetailQuery.data?.name), to: catalogPaths.titlesForSeries(listSeriesId) }
          : { label: 'Danh mục đầu sách', to: catalogPaths.titleList },
    ]
  }

  const crumbs: BreadcrumbItem[] = [root]
  if (!titleMatch && !editionMatch && !copyMatch) return crumbs

  // Wait for the title before choosing between a series parent and the plain title list.
  if (title) {
    crumbs.push(
        title.seriesId
            ? { label: seriesLabel(title.seriesName), to: catalogPaths.titlesForSeries(title.seriesId) }
            : { label: 'Danh mục đầu sách', to: catalogPaths.titleList },
    )
  }
  if (titleId) {
    crumbs.push({ label: title?.name ?? 'Đầu sách', to: catalogPaths.titleDetail(titleId) })
  }
  if (editionMatch || copyMatch) {
    if (editionId) crumbs.push({ label: editionLabel(editionQuery.data), to: catalogPaths.editionDetail(editionId) })
  }
  if (copyMatch) {
    crumbs.push({ label: copyQuery.data?.copyBarcode ?? 'Bản sách vật lý' })
  }
  return crumbs
}

// ----------------------------------------------------------------------
// SERIES MUTATION HOOKS
// ----------------------------------------------------------------------

export function useCreateSeriesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateSeriesRequest) => createSeries(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'series'] }),
  })
}

export function useUpdateSeriesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ seriesId, request }: { seriesId: string; request: UpdateSeriesRequest }) => updateSeries(seriesId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'series'] }),
  })
}

export function useUpdateSeriesStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ seriesId, isActive }: { seriesId: string; isActive: boolean }) => updateSeriesStatus(seriesId, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'series'] }),
  })
}

export function useDeleteSeriesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (seriesId: string) => deleteSeries(seriesId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'series'] }),
  })
}

export function useReplaceSeriesImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ seriesId, imageUpload }: { seriesId: string; imageUpload: CloudinaryUploadResultRequest }) =>
        replaceSeriesImage(seriesId, imageUpload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'series'] }),
  })
}

export function useDeleteSeriesImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (seriesId: string) => deleteSeriesImage(seriesId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'series'] }),
  })
}

// ----------------------------------------------------------------------
// TITLE MUTATION HOOKS
// ----------------------------------------------------------------------

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

export function useUpdateTitleStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ titleId, isActive }: { titleId: string; isActive: boolean }) => updateTitleStatus(titleId, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'titles'] }),
  })
}

export function useDeleteTitleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (titleId: string) => deleteTitle(titleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  })
}

export function useReplaceTitleImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ titleId, imageUpload }: { titleId: string; imageUpload: CloudinaryUploadResultRequest }) =>
        replaceTitleImage(titleId, imageUpload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'titles'] }),
  })
}

export function useDeleteTitleImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (titleId: string) => deleteTitleImage(titleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'titles'] }),
  })
}

// ----------------------------------------------------------------------
// EDITION MUTATION HOOKS
// ----------------------------------------------------------------------

export function useCreateEditionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateEditionRequest) => createEdition(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  })
}

export function useUpdateEditionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ editionId, request }: { editionId: string; request: UpdateEditionRequest }) =>
        updateEdition(editionId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  })
}

export function useUpdateEditionStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ editionId, isActive }: { editionId: string; isActive: boolean }) =>
        updateEditionStatus(editionId, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'editions'] }),
  })
}

export function useDeleteEditionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (editionId: string) => deleteEdition(editionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  })
}

export function useReplaceEditionImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ editionId, imageUpload }: { editionId: string; imageUpload: CloudinaryUploadResultRequest }) =>
        replaceEditionImage(editionId, imageUpload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'editions'] }),
  })
}

export function useDeleteEditionImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (editionId: string) => deleteEditionImage(editionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'editions'] }),
  })
}

// ----------------------------------------------------------------------
// COPY MUTATION HOOKS
// ----------------------------------------------------------------------

export function useCreateCopyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateCopyRequest) => createCopy(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  })
}

export function useUpdateCopyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ copyId, request }: { copyId: string; request: UpdateCopyRequest }) =>
        updateCopy(copyId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'copies'] }),
  })
}

export function useUpdateCopyStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ copyId, request }: { copyId: string; request: UpdateCopyStatusRequest }) =>
        updateCopyStatus(copyId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'copies'] }),
  })
}

export function useCreateCopyLabelMutation() {
  return useMutation({
    mutationFn: (copyId: string) => createCopyLabel(copyId),
  })
}

export function useReplaceCopyImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ copyId, imageUpload }: { copyId: string; imageUpload: CloudinaryUploadResultRequest }) =>
        replaceCopyImage(copyId, imageUpload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'copies'] }),
  })
}

export function useDeleteCopyImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (copyId: string) => deleteCopyImage(copyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'copies'] }),
  })
}