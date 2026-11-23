import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let server
let posFixture
let approvalTabs
let settingsTabs
let catalogWorkspace

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  posFixture = await server.ssrLoadModule('/src/features/pos/pos-transaction.fixture.ts')
  approvalTabs = await server.ssrLoadModule('/src/features/approvals/components/ApprovalTabBar.tsx')
  settingsTabs = await server.ssrLoadModule('/src/features/settings/components/SettingsTabBar.tsx')
  catalogWorkspace = await server.ssrLoadModule('/src/features/catalog/catalog-tabs.ts')
})

after(async () => {
  await server?.close()
})

test('POS child policy selects the first allowed tab and hides forbidden tabs', () => {
  assert.deepEqual(posFixture.getVisiblePosTabs('ADMIN').map((tab) => tab.id), ['sale', 'rental', 'renewal', 'return', 'buyback'])
  assert.deepEqual(posFixture.getVisiblePosTabs('CASHIER').map((tab) => tab.id), ['sale', 'rental', 'renewal', 'return', 'buyback'])
  assert.deepEqual(posFixture.getVisiblePosTabs('INVENTORY_MANAGER').map((tab) => tab.id), ['buyback'])
})

test('Approvals hides inventory adjustment from Employee but keeps it for Admin and Inventory', () => {
  assert.deepEqual(approvalTabs.getVisibleApprovalTabs('CASHIER').map((tab) => tab.key), ['old-book-price', 'damage-penalty', 'disposal-reversal'])
  assert.equal(approvalTabs.getVisibleApprovalTabs('INVENTORY_MANAGER').some((tab) => tab.key === 'inventory-adjustment'), true)
  assert.equal(approvalTabs.getVisibleApprovalTabs('ADMIN').some((tab) => tab.key === 'inventory-adjustment'), true)
})

test('Settings child policy exposes only Rental and Membership to non-Admin roles', () => {
  assert.deepEqual(settingsTabs.getVisibleSettingsTabs('CASHIER').map((tab) => tab.key), ['rental', 'tiers'])
  assert.deepEqual(settingsTabs.getVisibleSettingsTabs('INVENTORY_MANAGER').map((tab) => tab.key), ['rental', 'tiers'])
  assert.deepEqual(settingsTabs.getVisibleSettingsTabs('ADMIN').map((tab) => tab.key), ['rental', 'tiers', 'rbac', 'integrations'])
})

test('Catalog hides title navigation when its read permission is unavailable', () => {
  assert.deepEqual(
    catalogWorkspace.getVisibleCatalogTabs('ADMIN', new Set(['BookTitles.GetTitles']), 'ready').map((tab) => tab.id),
    ['categories', 'series', 'titles'],
  )
  assert.deepEqual(
    catalogWorkspace.getVisibleCatalogTabs('ADMIN', new Set(), 'ready').map((tab) => tab.id),
    ['categories', 'series'],
  )
})

test('forbidden child queries are disabled before the inventory tab can render', () => {
  const hookSource = readFileSync(new URL('../src/features/approvals/approvals.hook.ts', import.meta.url), 'utf8')
  const pageSource = readFileSync(new URL('../src/features/approvals/pages/ApprovalsPage.tsx', import.meta.url), 'utf8')
  assert.match(hookSource, /useApprovalsQuery\(query: InventoryAdjustmentQuery, enabled = true\)/)
  assert.match(hookSource, /useApprovalsStatsQuery\(enabled = true\)/)
  assert.match(pageSource, /useApprovalsQuery\(queryParams, canReadInventoryAdjustment\)/)
  assert.match(pageSource, /useApprovalsStatsQuery\(canReadInventoryAdjustment\)/)
  assert.match(pageSource, /useApprovalsOverviewStatsQuery\(canReadInventoryAdjustment\)/)
})
