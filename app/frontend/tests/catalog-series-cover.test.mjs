import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
