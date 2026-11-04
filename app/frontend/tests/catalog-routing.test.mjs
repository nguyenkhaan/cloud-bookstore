import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let catalogRoutes
let server

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  catalogRoutes = await server.ssrLoadModule('/src/features/catalog/catalog.route.ts')
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
