import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const routes = readFileSync(path.join(frontendRoot, 'src', 'routes', 'AppRoutes.tsx'), 'utf8')

test('application routes declare each authentication path once and guard catalog screens', () => {
  assert.equal((routes.match(/path="\/verify-register"/g) ?? []).length, 1)
  for (const path of ['/catalog/series', '/catalog/titles', '/catalog/titles/:titleId', '/catalog/editions/:editionId', '/catalog/copies/:copyId']) {
    assert.match(routes, new RegExp(`path="${path}" element=\\{<RequireSession>`))
  }
})
