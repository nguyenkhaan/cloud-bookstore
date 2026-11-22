import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readSource = (...parts) => readFileSync(path.join(frontendRoot, 'src', ...parts), 'utf8')

test('snowfall is mounted globally without intercepting the application', () => {
  const component = readSource('components', 'common', 'Snowfall', 'Snowfall.tsx')
  const styles = readSource('index.css')
  const main = readSource('main.tsx')

  assert.match(main, /<Snowfall \/>/)
  assert.match(component, /aria-hidden="true"/)
  assert.match(component, /SNOWFLAKES = Array\.from\(\{ length: 32 \}/)
  assert.match(styles, /\.snowfall-overlay[\s\S]*pointer-events: none/)
  assert.match(styles, /\.snowfall-flake[\s\S]*border: 1px solid/)
  assert.match(styles, /prefers-reduced-motion: reduce[\s\S]*\.snowfall-overlay[\s\S]*display: none/)
})
