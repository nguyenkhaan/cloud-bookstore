import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createServer } from 'vite'

let catalogRoutes
let workspaceRoutes
let server
const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  catalogRoutes = await server.ssrLoadModule('/src/features/catalog/catalog.route.ts')
  workspaceRoutes = await server.ssrLoadModule('/src/features/workspace/workspace.route.ts')
})

after(async () => {
  await server?.close()
})

test('catalog routes preserve the series → title → edition → physical copy hierarchy', () => {
  assert.equal(catalogRoutes.catalogPaths.seriesList, '/catalog/series')
  assert.equal(catalogRoutes.catalogPaths.titleList, '/catalog/titles')
  assert.equal(catalogRoutes.catalogPaths.titleDetail('title-42'), '/catalog/titles/title-42')
  assert.equal(catalogRoutes.catalogPaths.editionDetail('edition-18'), '/catalog/editions/edition-18')
  assert.equal(catalogRoutes.catalogPaths.copyDetail('copy-9'), '/catalog/copies/copy-9')
})

test('catalog list links retain the series filter when moving from a series into its titles', () => {
  assert.equal(
    catalogRoutes.catalogPaths.titlesForSeries('series-24'),
    '/catalog/titles?seriesId=series-24',
  )
})

test('every sidebar workspace has a route and a feature-owned placeholder page', () => {
  const expectedModules = {
    pos: '/pos',
    customers: '/customers',
    hr: '/hr',
    approvals: '/approvals',
    audit: '/audit',
    reports: '/reports',
    settings: '/settings',
  }

  for (const [module, route] of Object.entries(expectedModules)) {
    assert.equal(workspaceRoutes.workspacePaths[module], route)
    assert.ok(existsSync(path.join(frontendRoot, 'src', 'features', module, 'pages')), `${module} needs a feature page`)
  }
})
