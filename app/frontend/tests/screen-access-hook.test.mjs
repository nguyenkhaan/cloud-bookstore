import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createServer } from 'vite'

let server
let AuthContext
let useScreenAccess
let resolveEffectiveScreenAccess

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  ;({ AuthContext } = await server.ssrLoadModule('/src/context/AuthProvider.ts'))
  ;({ useScreenAccess } = await server.ssrLoadModule('/src/hooks/useScreenAccess.ts'))
  ;({ resolveEffectiveScreenAccess } = await server.ssrLoadModule('/src/routes/screen-access.policy.ts'))
})

after(async () => {
  await server?.close()
})

function accessMarkup(client, role, screenId, id = 'user-1') {
  function AccessView() {
    const result = useScreenAccess(screenId)
    return React.createElement(
      'output',
      null,
      [result.access, result.canRead, result.canUpdate, result.isResolving, result.permissionsError].join('|'),
    )
  }

  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(
        AuthContext.Provider,
        {
          value: {
            session: { authenticated: true, user: { id, email: `${id}@example.test`, roleCode: role } },
            isInitializing: false,
          },
        },
        React.createElement(AccessView),
      ),
    ),
  )
}

function readMarkup(html) {
  const [access, canRead, canUpdate, isResolving, permissionsError] = html
    .replace(/^<output>(.*)<\/output>$/, '$1')
    .split('|')
  return {
    access,
    canRead: canRead === 'true',
    canUpdate: canUpdate === 'true',
    isResolving: isResolving === 'true',
    permissionsError: permissionsError === 'true',
  }
}

test('ready permission data grants update and revoking update downgrades to read-only', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const key = ['role-permissions', 'user-1', 'user-1@example.test', 'ADMIN']
  client.setQueryData(key, ['BookTitles.Read', 'BookTitles.UpdateTitle'])

  assert.deepEqual(readMarkup(accessMarkup(client, 'ADMIN', 'catalogTitles')), {
    access: 'U', canRead: true, canUpdate: true, isResolving: false, permissionsError: false,
  })

  client.setQueryData(key, ['BookTitles.Read'])
  assert.deepEqual(readMarkup(accessMarkup(client, 'ADMIN', 'catalogTitles')), {
    access: 'R', canRead: true, canUpdate: false, isResolving: false, permissionsError: false,
  })
  client.clear()
})

test('loading and error permission states never grant an update action', () => {
  const loadingClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false } } })
  const loading = readMarkup(accessMarkup(loadingClient, 'ADMIN', 'catalogTitles'))
  assert.equal(loading.access, 'R')
  assert.equal(loading.canUpdate, false)
  assert.equal(loading.isResolving, true)

  const errorClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false } } })
  const key = ['role-permissions', 'user-1', 'user-1@example.test', 'ADMIN']
  errorClient.setQueryData(key, ['BookTitles.Read'])
  const query = errorClient.getQueryCache().build(errorClient, { queryKey: key, queryFn: async () => [] })
  query.setState({
    status: 'error',
    fetchStatus: 'idle',
    error: new Error('permission unavailable'),
    data: ['BookTitles.Read'],
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: Date.now(),
  })
  const error = readMarkup(accessMarkup(errorClient, 'ADMIN', 'catalogTitles'))
  assert.equal(error.access, 'R')
  assert.equal(error.canUpdate, false)
  assert.equal(error.permissionsError, true)
  errorClient.clear()
})

test('protected and immutable read-only policies cannot be upgraded by injected client permissions', () => {
  assert.equal(
    resolveEffectiveScreenAccess('settingsRbac', 'CASHIER', new Set(['Settings.UpdateRbacMatrix']), 'ready'),
    'N',
  )
  assert.equal(
    resolveEffectiveScreenAccess('catalogTitles', 'CASHIER', new Set(['BookTitles.Read', 'BookTitles.UpdateTitle']), 'ready'),
    'R',
  )
  assert.equal(
    resolveEffectiveScreenAccess('catalogTitles', 'ADMIN', new Set(), 'ready'),
    'N',
  )
})
