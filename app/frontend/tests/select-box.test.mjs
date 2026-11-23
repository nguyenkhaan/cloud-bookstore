import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { after, before, describe, test } from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(path.join(frontendRoot, 'src', relative), 'utf8')

function allTsxUnder(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return allTsxUnder(full)
    return full.endsWith('.tsx') ? [full] : []
  })
}

describe('select box search and keyboard logic', { concurrency: false }, () => {
  let server
  let utils

  before(async () => {
    server = await createServer({ appType: 'custom', server: { hmr: false, middlewareMode: true } })
    utils = await server.ssrLoadModule('/src/components/common/SelectBox/selectBox.utils.ts')
  })

  after(async () => {
    await server?.close()
  })

  const opts = [
    { value: 'harry', label: 'Harry Potter' },
    { value: 'ky', label: 'Kỳ Án' },
    { value: 'ultra', label: 'Ultraman Zero' },
  ]

  test('normalizes case, Vietnamese diacritics and đ', () => {
    assert.equal(utils.normalizeSearchText('  Đắc Nhân TÂM '), 'dac nhan tam')
  })

  test('filters options without accents or case and keeps all for an empty query', () => {
    assert.deepEqual(utils.filterOptions(opts, 'ky').map((o) => o.value), ['ky'])
    assert.deepEqual(utils.filterOptions(opts, 'ULTRA').map((o) => o.value), ['ultra'])
    assert.equal(utils.filterOptions(opts, '').length, opts.length)
    assert.equal(utils.filterOptions(opts, '   ').length, opts.length)
  })

  test('reports the matched range on the original label', () => {
    assert.deepEqual(utils.getMatchRange('Ultraman Zero', 'ul'), [0, 2])
    assert.deepEqual(utils.getMatchRange('Kỳ Án', 'an'), [3, 5])
    assert.equal(utils.getMatchRange('Harry', 'zz'), null)
    assert.equal(utils.getMatchRange('Harry', ''), null)
  })

  test('moves the active option with wrap-around and handles an empty list', () => {
    assert.equal(utils.moveActiveIndex('ArrowDown', 2, 3), 0)
    assert.equal(utils.moveActiveIndex('ArrowUp', 0, 3), 2)
    assert.equal(utils.moveActiveIndex('Home', 2, 3), 0)
    assert.equal(utils.moveActiveIndex('End', 0, 3), 2)
    assert.equal(utils.moveActiveIndex('ArrowDown', -1, 0), -1)
    assert.equal(utils.moveActiveIndex('ArrowUp', -1, 3), 2)
  })

  test('decomposed (NFD) Vietnamese input still matches accented labels', () => {
    const decomposed = 'Kỳ'.normalize('NFD')
    assert.equal(utils.normalizeSearchText(decomposed), 'ky')
    assert.deepEqual(utils.filterOptions(opts, decomposed).map((o) => o.value), ['ky'])
  })
})

test('SelectBox renders an accessible portal listbox with search and safe Escape handling', () => {
  const src = read('components/common/SelectBox/SelectBox.tsx')
  assert.match(src, /createPortal\(/)
  assert.match(src, /aria-haspopup="listbox"/)
  assert.match(src, /aria-expanded=\{isOpen\}/)
  assert.match(src, /role="combobox"/)
  assert.match(src, /aria-activedescendant=/)
  assert.match(src, /role="listbox"/)
  assert.match(src, /role="option"/)
  assert.match(src, /aria-selected=/)
  assert.match(src, /case 'Escape':[\s\S]{0,200}event\.stopPropagation\(\)/)
  assert.match(src, /Không tìm thấy kết quả phù hợp/)
  assert.match(src, /aria-live="polite"/)
  assert.match(read('components/common/index.ts'), /export \* from '\.\/SelectBox'/)
})

test('native selects are replaced by SelectBox without changing values or payloads', () => {
  for (const file of allTsxUnder(path.join(frontendRoot, 'src'))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /<select\b/, file)
  }
  const titleList = read('features/catalog/pages/TitleListPage.tsx')
  assert.match(titleList, /<SelectBox[\s\S]*label="Lọc theo bộ sách"/)
  assert.match(titleList, /setSearchParams\(value \? \{ seriesId: value \} : \{\}\)/)
  const titleEditor = read('features/catalog/components/TitleEditorDialog.tsx')
  assert.match(titleEditor, /label="Thuộc bộ sách"/)
  assert.match(titleEditor, /onChange=\{setSeriesId\}/)
  const copy = read('features/catalog/components/CopyEditorDialog.tsx')
  assert.match(copy, /label="Kênh sử dụng"/)
  assert.match(copy, /label="Tình trạng"/)
  assert.match(copy, /receiptLines\.map\(\(line\) =>/)
  assert.match(copy, /receiptLineId: selectedReceiptLineId/)
  assert.doesNotMatch(copy, /options=\{\[\]\}/)
})

test('search input is focused only after the portal menu has actually rendered', () => {
  const src = read('components/common/SelectBox/SelectBox.tsx')
  assert.match(src, /const isMenuRendered = isOpen && position !== null/)
  assert.match(src, /if \(isMenuRendered\) searchRef\.current\?\.focus\(\)\s*\}, \[isMenuRendered\]\)/)
})

test('clicks inside the menu never steal focus from the search input', () => {
  const src = read('components/common/SelectBox/SelectBox.tsx')
  assert.match(src, /onMouseDown=\{\(event\) => \{\s*if \(event\.target !== searchRef\.current\) event\.preventDefault\(\)\s*\}\}\s*ref=\{menuRef\}/)
})

test('menu is portaled inside the surrounding modal dialog so assistive tech can reach it', () => {
  const src = read('components/common/SelectBox/SelectBox.tsx')
  assert.match(src, /wrapperRef\.current\?\.closest\('\[role="dialog"\]'\) \?\? document\.body/)
})

test('empty-list message is not repeated in the footer', () => {
  const src = read('components/common/SelectBox/SelectBox.tsx')
  assert.doesNotMatch(src, /options\.length === 0 \? emptyMessage/)
})
