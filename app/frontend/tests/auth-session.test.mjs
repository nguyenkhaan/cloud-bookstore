import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { after, before, test } from 'node:test'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const src = (...parts) => resolve(import.meta.dirname, '..', 'src', ...parts)

let loginPage
let server

before(async () => {
  server = await createServer({ appType: 'custom', server: { hmr: false, middlewareMode: true } })
  loginPage = await server.ssrLoadModule('/src/features/auth/pages/LoginPage.tsx')
})

after(async () => {
  await server?.close()
})

test('the dashboard route waits for AuthProvider and redirects unauthenticated users', () => {
  const routes = readFileSync(src('routes', 'AppRoutes.tsx'), 'utf8')

  assert.match(routes, /if \(isInitializing\) return null/)
  assert.match(routes, /if \(!session\)/)
  assert.match(routes, /\/login\?next=\$\{next\}/)
})

test('the application root does not opt into StrictMode effect replay', () => {
  const main = readFileSync(src('main.tsx'), 'utf8')

  assert.doesNotMatch(main, /<StrictMode>/)
})

test('only local application paths are accepted as a post-login destination', () => {
  assert.equal(loginPage.getSafeNextPath('/dashboard?tab=today'), '/dashboard?tab=today')
  assert.equal(loginPage.getSafeNextPath('https://example.com/phishing'), '/dashboard')
  assert.equal(loginPage.getSafeNextPath('//example.com/phishing'), '/dashboard')
  assert.equal(loginPage.getSafeNextPath(null), '/dashboard')
})

test('route helpers are not kept in a separate session module', () => {
  assert.equal(existsSync(src('features', 'auth', 'session.ts')), false)
})
