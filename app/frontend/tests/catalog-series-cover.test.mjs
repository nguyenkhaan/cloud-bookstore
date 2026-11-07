import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = (...parts) => readFileSync(path.join(frontendRoot, 'src', ...parts), 'utf8')

test('series cover stack fills the frame anchored at the top and flips 62deg', () => {
  const src = source('features', 'catalog', 'components', 'SeriesCoverStack.tsx')
  assert.match(src, /export function SeriesCoverStack/)
  assert.match(src, /object-cover object-top/)
  assert.doesNotMatch(src, /object-contain/)
  assert.doesNotMatch(src, /blur/)
  assert.equal((src.match(/<img\b/g) ?? []).length, 1)
  assert.match(src, /group-hover:-rotate-y-62/)
  assert.match(src, /group-focus-visible:-rotate-y-62/)
  assert.match(src, /origin-left/)
  assert.match(src, /backface-hidden/)
  assert.match(src, /motion-reduce:transition-none/)
  assert.match(src, /motion-reduce:group-hover:rotate-y-0/)
  assert.match(src, /onError=\{\(\) => setFailed\(true\)\}/)
  assert.match(src, /\|\| 'S'/)
  assert.match(src, /\$\{titleCount \?\? 0\} tập/)
})

test('inner page behind the cover is plain white without ruled lines', () => {
  const src = source('features', 'catalog', 'components', 'SeriesCoverStack.tsx')
  assert.doesNotMatch(src, /repeating-linear-gradient/)
  assert.doesNotMatch(src, /amber/)
  assert.match(src, /rounded-r-lg bg-white/)
})

test('series list card is a single focusable link that drives the cover flip', () => {
  const page = source('features', 'catalog', 'pages', 'SeriesListPage.tsx')
  assert.match(page, /<SeriesCoverStack /)
  assert.doesNotMatch(page, /function SeriesCover\(/)
  assert.match(page, /<Link[^>]*className="group[^"]*focus-visible:ring/)
  assert.match(page, /to=\{catalogPaths\.titlesForSeries\(item\.id\)\}/)
  assert.equal((page.match(/<Link\b/g) ?? []).length, 1)
})

test('series card link name comes from visible text and keeps status/progress as description', () => {
  const page = source('features', 'catalog', 'pages', 'SeriesListPage.tsx')
  assert.doesNotMatch(page, /aria-label=\{`Xem đầu sách của bộ/)
  assert.match(page, /aria-labelledby=\{`series-\$\{item\.id\}-name series-\$\{item\.id\}-cta`\}/)
  assert.match(page, /aria-describedby=\{`series-\$\{item\.id\}-status series-\$\{item\.id\}-details`\}/)
  for (const part of ['name', 'cta', 'status', 'details']) {
    assert.match(page, new RegExp(`id=\\{\`series-\\$\\{item\\.id\\}-${part}\`\\}`))
  }
})

test('series cards provide separate edit and delete controls without a delete mutation', () => {
  const page = source('features', 'catalog', 'pages', 'SeriesListPage.tsx')
  const actionsPath = path.join(frontendRoot, 'src', 'features', 'catalog', 'components', 'SeriesCardActions.tsx')
  const confirmationPath = path.join(frontendRoot, 'src', 'components', 'common', 'ConfirmationDialog', 'ConfirmationDialog.tsx')

  assert.ok(existsSync(actionsPath), 'SeriesCardActions should exist')
  assert.ok(existsSync(confirmationPath), 'ConfirmationDialog should exist as a shared component')
  const actions = readFileSync(actionsPath, 'utf8')
  const confirmation = readFileSync(confirmationPath, 'utf8')

  assert.match(page, /import \{ SeriesCardActions \} from '\.\.\/components\/SeriesCardActions'/)
  assert.match(page, /<SeriesCardActions series=\{item\} \/>/)
  assert.match(actions, /Pencil/)
  assert.match(actions, /Trash2/)
  assert.match(actions, /aria-label=\{`Chỉnh sửa \$\{series\.name\}`\}/)
  assert.match(actions, /aria-label=\{`Xóa \$\{series\.name\}`\}/)
  assert.match(actions, /Thông tin chung/)
  assert.match(actions, /Ảnh bìa/)
  assert.match(actions, /import \{ Button, ConfirmationDialog, TextField \} from '@\/components\/common'/)
  assert.match(actions, /<ConfirmationDialog/)
  assert.match(actions, /message=\{`Chỉ có thể xóa bộ sách/)
  assert.match(actions, /actions=\{<>/)
  assert.match(confirmation, /message: string/)
  assert.match(confirmation, /actions: ReactNode/)
  assert.doesNotMatch(actions, /useDeleteSeriesMutation|deleteSeries\(/)
})

test('series details submit uses update and status mutations with an explicit pending state', () => {
  const actions = source('features', 'catalog', 'components', 'SeriesCardActions.tsx')

  assert.match(actions, /useUpdateSeriesMutation, useUpdateSeriesStatusMutation/)
  assert.match(actions, /const updateSeries = useUpdateSeriesMutation\(\)/)
  assert.match(actions, /const updateStatus = useUpdateSeriesStatusMutation\(\)/)
  assert.match(actions, /const handleDetailsSubmit = async \(event: FormEvent<HTMLFormElement>\)/)
  assert.match(actions, /await updateSeries\.mutateAsync\(\{ seriesId: series\.id, request: \{ name: trimmedName, description: description\.trim\(\) \|\| null \} \}\)/)
  assert.match(actions, /if \(isActive !== series\.isActive\)/)
  assert.match(actions, /await updateStatus\.mutateAsync\(\{ seriesId: series\.id, isActive \}\)/)
  assert.match(actions, /Thông tin chung đã được lưu, nhưng không thể cập nhật trạng thái\./)
  assert.match(actions, /loading=\{isSaving\}[\s\S]*\{isSaving \? 'Đang lưu…' : 'Lưu thay đổi'\}/)
  assert.match(actions, /role="alert"/)
  assert.doesNotMatch(actions, /useDeleteSeriesMutation|deleteSeries\(/)
})

test('series cover uploads directly, previews the Cloudinary result, and never deletes', () => {
  const actions = source('features', 'catalog', 'components', 'SeriesCardActions.tsx')

  assert.match(actions, /useReplaceSeriesImageMutation/)
  assert.match(actions, /uploadImage\('BOOK_SERIES_IMAGE', file\)/)
  assert.match(actions, /const \[pendingImage, setPendingImage\] = useState<UploadedImage \| null>\(null\)/)
  assert.match(actions, /const \[uploadedPreviewUrl, setUploadedPreviewUrl\] = useState<string \| null>\(null\)/)
  assert.match(actions, /const previewUrl = uploadedPreviewUrl \?\? series\.imageUrl/)
  assert.match(actions, /src=\{previewUrl\}/)
  assert.match(actions, /type="file"/)
  assert.match(actions, /loading=\{isImageBusy\}/)
  assert.match(actions, /isImageUploading \? 'Đang tải ảnh…' : replaceSeriesImage\.isPending \? 'Đang lưu ảnh…'/)
  assert.match(actions, /if \(error instanceof CatalogApiError && error\.status === 409\)/)
  assert.match(actions, /Thử lưu ảnh/)
  assert.doesNotMatch(actions, /useDeleteSeriesMutation|useDeleteSeriesImageMutation|deleteSeries\(|deleteSeriesImage\(/)
})

test('catalog dialogs restore opener focus and keep the backdrop out of tab order', () => {
  const dialog = source('features', 'catalog', 'components', 'CatalogDialog.tsx')

  assert.match(dialog, /triggerRef\?: RefObject<HTMLButtonElement \| null>/)
  assert.match(dialog, /triggerRef\?\.current\?\.focus\(\)/)
  assert.match(dialog, /aria-label="Đóng hộp thoại"[\s\S]*tabIndex=\{-1\}/)
})
