import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = path.join(frontendRoot, 'src')

test('frontend uses the staged source structure and a single TypeScript config', () => {
  const directories = [
    'api',
    'assets',
    'components',
    'context',
    'contract',
    'features',
    'hooks',
    'lib',
    'pages',
    'routes',
    'store/slices',
  ]
  const rootFiles = ['App.css', 'App.tsx', 'index.css', 'main.tsx', 'vite-env.d.ts']

  for (const directory of directories) {
    assert.ok(existsSync(path.join(srcRoot, directory)), `missing src/${directory}`)
  }
  for (const file of rootFiles) {
    assert.ok(existsSync(path.join(srcRoot, file)), `missing src/${file}`)
  }

  assert.ok(!existsSync(path.join(srcRoot, 'tmp')))
  assert.ok(!existsSync(path.join(frontendRoot, 'tsconfig.app.json')))
  assert.ok(!existsSync(path.join(frontendRoot, 'tsconfig.node.json')))

  const tsconfig = JSON.parse(readFileSync(path.join(frontendRoot, 'tsconfig.json'), 'utf8'))
  assert.deepEqual(tsconfig.include, ['src', 'vite.config.ts'])
  assert.equal(tsconfig.references, undefined)
})

test('the application header uses compact mobile gutters and permits breadcrumb content to shrink', () => {
  const header = readFileSync(path.join(srcRoot, 'components', 'layout', 'Header', 'Header.tsx'), 'utf8')

  assert.match(header, /px-3 sm:px-6/)
  assert.match(header, /flex min-w-0 flex-1 items-center gap-3/)
  assert.match(header, /min-w-0 items-center space-x-2 overflow-hidden whitespace-nowrap/)
})
