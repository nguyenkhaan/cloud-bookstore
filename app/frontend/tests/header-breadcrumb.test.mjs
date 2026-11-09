import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)

test('breadcrumb and avatar are shared components used by the header', () => {
    assert.ok(existsSync(src('components', 'common', 'Breadcrumb', 'Breadcrumb.tsx')))
    assert.ok(existsSync(src('components', 'common', 'Avatar', 'Avatar.tsx')))

    const header = readFileSync(src('components', 'layout', 'Header', 'Header.tsx'), 'utf8')
    assert.match(header, /<Breadcrumb\b/)
    assert.match(header, /<Avatar\b/)
    assert.doesNotMatch(header, /<a\s/, 'breadcrumb links must use react-router, not full-page anchors')
})

test('breadcrumb marks the current page and routes parents through react-router', () => {
    const breadcrumb = readFileSync(src('components', 'common', 'Breadcrumb', 'Breadcrumb.tsx'), 'utf8')
    assert.match(breadcrumb, /from 'react-router-dom'/)
    assert.match(breadcrumb, /aria-current="page"/)
})

test('catalog pages build their breadcrumb from the route hierarchy', () => {
    const workspace = readFileSync(src('features', 'catalog', 'components', 'CatalogWorkspace.tsx'), 'utf8')
    assert.match(workspace, /useCatalogBreadcrumbs\(\)/)
    assert.doesNotMatch(workspace, /Không gian làm việc/)
})
