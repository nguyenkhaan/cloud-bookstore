import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

let server, AuthContext, usePermissions, SettingsHistory, ScrSys03RbacMatrix
before(async () => {
  server = await createServer({ appType: 'custom', server: { middlewareMode: true, hmr: false } })
  ;({ AuthContext } = await server.ssrLoadModule('/src/context/AuthProvider.ts'))
  ;({ usePermissions } = await server.ssrLoadModule('/src/hooks/usePermissions.ts'))
  ;({ SettingsHistory } = await server.ssrLoadModule('/src/features/settings/components/SettingsHistory.tsx'))
  ;({ ScrSys03RbacMatrix } = await server.ssrLoadModule('/src/features/settings/components/ScrSys03RbacMatrix.tsx'))
})
after(async () => { await server?.close() })

function render(client, child, role = 'CASHIER') {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client },
    React.createElement(AuthContext.Provider, { value: { session: { authenticated: true, user: { email: 'staff@example.test', roleCode: role } } } }, child)))
}

test('UI grants follow server permissions independently of role defaults and disappear on revoke', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function CreateButton() {
    const { can } = usePermissions()
    return React.createElement('button', { disabled: !can('BookTitles.CreateTitle') }, 'Tạo đầu sách')
  }
  const key = ['role-permissions', 'staff@example.test', 'CASHIER']
  assert.match(render(client, React.createElement(CreateButton)), /disabled=""/)
  client.setQueryData(key, ['BookTitles.CreateTitle'])
  assert.doesNotMatch(render(client, React.createElement(CreateButton)), /disabled/)
  assert.match(render(client, React.createElement(CreateButton), 'INVENTORY_MANAGER'), /disabled=""/, 'another role cannot reuse cached grants')
  client.setQueryData(key, [])
  assert.match(render(client, React.createElement(CreateButton)), /disabled=""/)
  client.clear()
})

test('matrix renders three roles and disables every protected grant', () => {
  const client = new QueryClient()
  client.setQueryData(['settings', 'rbac'], { items: [{ permissionCode: 'Settings.UpdateRbacMatrix', permissionName: 'Quản trị quyền', moduleTitle: 'Cấu hình', adminOnly: true, cashierAllowed: false, warehouseAllowed: false, adminAllowed: true }] })
  const html = render(client, React.createElement(ScrSys03RbacMatrix, { isAdmin: true }), 'ADMIN')
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 3)
  for (const box of html.match(/<input[^>]+type="checkbox"[^>]*>/g)) assert.match(box, /disabled/)
  assert.match(html, /Nhân viên/)
  assert.match(html, /Quản lý kho/)
  assert.doesNotMatch(html, /Manager|4 vai trò|39 màn hình/)
  client.clear()
})

test('history displays actor, reason and old/new values at the immediate effective time', () => {
  const client = new QueryClient()
  client.setQueryData(['settings-history', 'rental'], [{ id: 'audit-1', effectiveAt: '2026-11-20T12:00:00Z', actorName: 'Admin test', reason: 'Đổi số lần gia hạn', beforeJson: '{"maxExtensions":2}', afterJson: '{"maxExtensions":3}' }])
  const html = render(client, React.createElement(SettingsHistory, { group: 'rental', isAdmin: true }), 'ADMIN')
  assert.match(html, /Admin test/)
  assert.match(html, /Đổi số lần gia hạn/)
  assert.match(html, /Giá trị cũ/)
  assert.match(html, /Giá trị mới/)
  assert.match(html, /maxExtensions/)
  assert.equal(render(client, React.createElement(SettingsHistory, { group: 'rental', isAdmin: false })), '')
  client.clear()
})
