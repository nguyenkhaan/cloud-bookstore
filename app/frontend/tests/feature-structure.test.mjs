import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)

test('auth and dashboard UI are organized as feature modules', () => {
  const expectedFiles = [
    ['components', 'common', 'TextField', 'TextField.tsx'],
    ['features', 'auth', 'pages', 'LoginPage.tsx'],
    ['features', 'auth', 'pages', 'ActivateAccountPage.tsx'],
    ['features', 'auth', 'components', 'PasswordField.tsx'],
    ['features', 'auth', 'auth.hook.ts'],
    ['features', 'auth', 'auth.service.ts'],
    ['features', 'auth', 'auth.type.ts'],
    ['features', 'dashboard', 'pages', 'DashboardPage.tsx'],
    ['features', 'dashboard', 'dashboard.hook.ts'],
    ['features', 'dashboard', 'dashboard.service.ts'],
    ['features', 'dashboard', 'dashboard.type.ts'],
    ['routes', 'AppRoutes.tsx'],
  ]

  for (const parts of expectedFiles) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  assert.ok(!existsSync(src('tmp', 'pages', 'Login', 'LoginPage.tsx')))
  assert.ok(!existsSync(src('tmp', 'pages', 'Dashboard', 'DashboardPage.tsx')))

  const routes = readFileSync(src('routes', 'AppRoutes.tsx'), 'utf8')
  assert.match(routes, /from ['"]react-router-dom['"]/)
  assert.match(routes, /path=['"]\/login['"]/)
  assert.match(routes, /path=['"]\/dashboard['"]/)
  assert.doesNotMatch(routes, /@\/tmp\/pages/)
  assert.doesNotMatch(routes, /path=['"]\/(catalog|checkout|inventory)/)
})

test('shared components live outside tmp', () => {
  const sharedFiles = [
    ['components', 'common', 'Badge', 'Badge.tsx'],
    ['components', 'common', 'Button', 'Button.tsx'],
    ['components', 'common', 'Card', 'Card.tsx'],
    ['components', 'common', 'StatCard', 'StatCard.tsx'],
    ['components', 'common', 'Icons', 'Icons.tsx'],
    ['components', 'layout', 'MainLayout.tsx'],
    ['components', 'layout', 'Header', 'Header.tsx'],
    ['components', 'layout', 'Sidebar', 'Sidebar.tsx'],
    ['components', 'layout', 'Footer', 'Footer.tsx'],
  ]

  for (const parts of sharedFiles) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  assert.ok(existsSync(src('tmp', 'components', 'common', 'Modal', '.gitkeep')))
  assert.ok(!existsSync(src('tmp', 'components', 'common', 'Icons.tsx')))
})
