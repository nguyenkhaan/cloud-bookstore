import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = (...parts) => readFileSync(path.join(frontendRoot, 'src', ...parts), 'utf8')

test('catalog service maps query parameters to backend model bindings', () => {
  const catalogService = source('features', 'catalog', 'catalog.service.ts')

  // Search parameters must match ASP.NET Core DTO properties (Name, SeriesId)
  assert.match(catalogService, /Name:\s*search/)
  assert.match(catalogService, /Name:\s*filters\.search/)
  assert.match(catalogService, /SeriesId:\s*filters\.seriesId/)
})

test('catalog service exports full CRUD, status, image, barcode and label endpoints', () => {
  const catalogService = source('features', 'catalog', 'catalog.service.ts')

  const expectedFunctions = [
    // Series
    'listSeries', 'getSeries', 'createSeries', 'updateSeries', 'updateSeriesStatus', 'deleteSeries', 'replaceSeriesImage', 'deleteSeriesImage',
    // Titles
    'listTitles', 'getTitle', 'createTitle', 'updateTitle', 'updateTitleStatus', 'deleteTitle', 'replaceTitleImage', 'deleteTitleImage',
    // Editions
    'listEditions', 'getEdition', 'createEdition', 'updateEdition', 'updateEditionStatus', 'deleteEdition', 'replaceEditionImage', 'deleteEditionImage',
    // Copies
    'listCopies', 'getCopy', 'getCopyByBarcode', 'getCopyHistory', 'createCopy', 'updateCopy', 'updateCopyStatus', 'createCopyLabel', 'replaceCopyImage', 'deleteCopyImage',
  ]

  for (const fnName of expectedFunctions) {
    assert.match(catalogService, new RegExp(`export async function ${fnName}\\b`), `Missing function ${fnName} in catalog.service.ts`)
  }
})

test('catalog hooks export all queries and mutations matching service functions', () => {
  const catalogHook = source('features', 'catalog', 'catalog.hook.ts')

  const expectedHooks = [
    // Queries
    'useSeriesQuery', 'useSeriesDetailQuery', 'useTitlesQuery', 'useTitleQuery',
    'useEditionsQuery', 'useEditionQuery', 'useCopiesQuery', 'useCopyQuery',
    'useCopyByBarcodeQuery', 'useCopyHistoryQuery',
    // Series mutations
    'useCreateSeriesMutation', 'useUpdateSeriesMutation', 'useUpdateSeriesStatusMutation', 'useDeleteSeriesMutation', 'useReplaceSeriesImageMutation', 'useDeleteSeriesImageMutation',
    // Title mutations
    'useCreateTitleMutation', 'useUpdateTitleMutation', 'useUpdateTitleStatusMutation', 'useDeleteTitleMutation', 'useReplaceTitleImageMutation', 'useDeleteTitleImageMutation',
    // Edition mutations
    'useCreateEditionMutation', 'useUpdateEditionMutation', 'useUpdateEditionStatusMutation', 'useDeleteEditionMutation', 'useReplaceEditionImageMutation', 'useDeleteEditionImageMutation',
    // Copy mutations
    'useCreateCopyMutation', 'useUpdateCopyMutation', 'useUpdateCopyStatusMutation', 'useCreateCopyLabelMutation', 'useReplaceCopyImageMutation', 'useDeleteCopyImageMutation',
  ]

  for (const hookName of expectedHooks) {
    assert.match(catalogHook, new RegExp(`export function ${hookName}\\b`), `Missing hook ${hookName} in catalog.hook.ts`)
  }
})

test('series general-update payload is narrowed from the generated backend contract', () => {
  const catalogType = source('features', 'catalog', 'catalog.type.ts')

  assert.match(catalogType, /import type \{ components \} from '@\/contract\/api-contract'/)
  assert.match(
    catalogType,
    /export type UpdateSeriesRequest = Pick<components\['schemas'\]\['UpdateBookSeriesRequest'\], 'name' \| 'description'>/,
  )
  assert.doesNotMatch(catalogType, /UpdateSeriesRequest = \{[\s\S]*expectedVolumeCount/)
})

test('series cards show the backend image URL instead of a name initial', () => {
  const catalogType = source('features', 'catalog', 'catalog.type.ts')
  const seriesListPage = source('features', 'catalog', 'pages', 'SeriesListPage.tsx')
  const seriesCover = source('features', 'catalog', 'components', 'SeriesCoverStack.tsx')

  assert.match(catalogType, /imageUrl:\s*string\s*\|\s*null/)
  assert.match(seriesListPage, /<SeriesCoverStack imageUrl=\{item\.imageUrl\} name=\{item\.name\}/)
  assert.match(seriesCover, /src=\{coverUrl\}/)
  assert.match(seriesCover, /loading="lazy"/)
  assert.match(seriesCover, /alt=\{`Ảnh bìa bộ sách \$\{name\}`\}/)
  assert.match(seriesCover, /aspect-\[2\/3\]/)
  assert.match(seriesListPage, /grid gap-4 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3/)
  assert.doesNotMatch(seriesListPage, /item\.name\.charAt\(0\)/)
})

test('user session from auth context replaces hardcoded user in workspace and dashboard', () => {
  const catalogWorkspace = source('features', 'catalog', 'components', 'CatalogWorkspace.tsx')
  const dashboardPage = source('features', 'dashboard', 'pages', 'DashboardPage.tsx')

  assert.doesNotMatch(catalogWorkspace, /user=\{\{\s*name:\s*'Nguyễn Minh Anh'/)
  assert.match(catalogWorkspace, /user=\{currentUser\}/)

  assert.doesNotMatch(dashboardPage, /name:\s*'Nguyễn Minh Anh'/)
  assert.match(dashboardPage, /user=\{currentUser\}/)
})
