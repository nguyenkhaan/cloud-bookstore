import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createServer } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let server
let AuthContext
let RoleGuard
let routesSource

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  ;({ AuthContext } = await server.ssrLoadModule('/src/context/AuthProvider.ts'))
  ;({ RoleGuard } = await server.ssrLoadModule('/src/routes/RoleGuard.tsx'))
  routesSource = readFileSync(resolve(import.meta.dirname, '..', 'src', 'routes', 'AppRoutes.tsx'), 'utf8')
})

after(async () => {
  await server?.close()
})

function renderGuard(role, screenId) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false } } })
  return renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(
          AuthContext.Provider,
          {
            value: {
              session: { authenticated: true, user: { id: `user-${role}`, email: `${role}@example.test`, roleCode: role } },
              isInitializing: false,
            },
          },
          React.createElement(
            RoleGuard,
            { screenId },
            React.createElement('span', { 'data-testid': 'protected-child' }, 'protected content'),
          ),
        ),
      ),
    ),
  )
}

test('RoleGuard mounts the protected child for a readable role', () => {
  const html = renderGuard('ADMIN', 'reportsRevenueExpense')
  assert.match(html, /data-testid="protected-child"/)
  assert.doesNotMatch(html, /Không có quyền truy cập trang này/)
})

test('RoleGuard renders shared 403 and does not mount the protected child for N', () => {
  const html = renderGuard('CASHIER', 'reportsRevenueExpense')
  assert.doesNotMatch(html, /data-testid="protected-child"/)
  assert.match(html, /403/)
  assert.doesNotMatch(html, /ADMIN|CASHIER|INVENTORY_MANAGER/)
})

test('RoleGuard fails closed for an invalid role', () => {
  const html = renderGuard('UNKNOWN_ROLE', 'dashboard')
  assert.doesNotMatch(html, /data-testid="protected-child"/)
  assert.match(html, /403/)
})

test('AppRoutes uses RoleGuard for aliases before navigation and removes ad-hoc role guards', () => {
  assert.doesNotMatch(routesSource, /function RequireRole/)
  assert.doesNotMatch(routesSource, /<RequireRole/)
  assert.doesNotMatch(routesSource, /path="\/book-series"/)
  assert.match(routesSource, /path="\/catalog\/suppliers"[\s\S]*?RoleGuard/)
  assert.match(routesSource, /path="\/catalog\/series"[\s\S]*?screenId="catalogSeries"/)
})
