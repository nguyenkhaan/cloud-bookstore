import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createServer } from 'vite'

let catalogRoutes
let workspaceRoutes
let appRoutesSource
let server
const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readTypeScriptSources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return readTypeScriptSources(entryPath)
    return /\.(?:ts|tsx)$/.test(entry.name)
      ? [{ path: entryPath, source: readFileSync(entryPath, 'utf8') }]
      : []
  })
}

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  catalogRoutes = await server.ssrLoadModule('/src/features/catalog/catalog.route.ts')
  workspaceRoutes = await server.ssrLoadModule('/src/features/workspace/workspace.route.ts')
  appRoutesSource = readFileSync(path.join(frontendRoot, 'src', 'routes', 'AppRoutes.tsx'), 'utf8')
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
  const expectedWorkspacePaths = {
    overview: '/dashboard',
    pos: '/pos',
    inventory: '/catalog/series',
    warehouse: '/suppliers',
    customers: '/customers',
    hr: '/hr',
    approvals: '/approvals',
    audit: '/audit',
    reports: '/reports',
    settings: '/settings',
  }
  const expectedFeatureModules = ['pos', 'customers', 'hr', 'approvals', 'audit', 'reports', 'settings']

  for (const [module, route] of Object.entries(expectedWorkspacePaths)) {
    assert.equal(workspaceRoutes.workspacePaths[module], route)
    assert.match(appRoutesSource, new RegExp(`path=\\{workspacePaths\\.${module}\\}`))
  }

  assert.deepEqual(
    workspaceRoutes.workspaceNavItems.map(({ id }) => id),
    Object.keys(expectedWorkspacePaths),
  )

  for (const module of expectedFeatureModules) {
    assert.ok(existsSync(path.join(frontendRoot, 'src', 'features', module, 'pages')), `${module} needs a feature page`)
  }
})

test('workspace navigation resolves only through declared paths and fails closed for unknown IDs', () => {
  for (const [module, route] of Object.entries(workspaceRoutes.workspacePaths)) {
    assert.equal(workspaceRoutes.workspacePathFor(module, 'ADMIN'), route, module)
  }

  assert.equal(workspaceRoutes.workspacePathFor('overview'), '/dashboard')
  assert.equal(workspaceRoutes.workspacePathFor('warehouse'), '/suppliers')
  assert.equal(workspaceRoutes.workspacePathFor('not-a-workspace'), undefined)
  for (const prototypeKey of ['toString', 'constructor', '__proto__']) {
    assert.equal(workspaceRoutes.workspacePathFor(prototypeKey), undefined, prototypeKey)
    assert.equal(workspaceRoutes.workspacePathFor(prototypeKey, 'ADMIN'), undefined, prototypeKey)
  }

  const settingsPage = readFileSync(
    path.join(frontendRoot, 'src', 'features', 'settings', 'pages', 'SettingsPage.tsx'),
    'utf8',
  )
  assert.match(settingsPage, /workspacePathFor/)
  assert.doesNotMatch(settingsPage, /navigate\(`\/\$\{id\}`\)/)
})

test('every MainLayout owner delegates Sidebar navigation to workspace.route.ts', () => {
  const offenders = readTypeScriptSources(path.join(frontendRoot, 'src'))
    .filter(({ source }) => source.includes('<MainLayout') && source.includes('onNavigate='))
    .filter(({ path: sourcePath }) => !sourcePath.endsWith(path.join('components', 'layout', 'MainLayout.tsx')))
    .filter(({ source }) => !source.includes('workspace.route'))
    .map(({ path: sourcePath }) => path.relative(frontendRoot, sourcePath))

  assert.deepEqual(offenders, [])
})

test('workspace navigation never returns an unreadable destination for a supplied role', () => {
  assert.equal(workspaceRoutes.workspacePathFor('reports', 'ADMIN'), '/reports')
  assert.equal(workspaceRoutes.workspacePathFor('reports', 'CASHIER'), undefined)
  assert.equal(workspaceRoutes.workspacePathFor('reports', 'INVENTORY_MANAGER'), undefined)
  assert.equal(workspaceRoutes.workspacePathFor('pos', 'INVENTORY_MANAGER'), '/pos')
  assert.equal(workspaceRoutes.workspacePathFor('settings', 'CASHIER'), '/settings')
})
