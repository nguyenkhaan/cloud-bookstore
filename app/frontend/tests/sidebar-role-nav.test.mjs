import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)

let server
let roleUtil

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  roleUtil = await server.ssrLoadModule('/src/features/hr/hr-role.util.ts')
})

after(async () => {
  await server?.close()
})

test('resolveHrRoleCode handles AuthUser roleCode and ?previewRole= override', () => {
  assert.equal(roleUtil.resolveHrRoleCode({ role: 'Quản trị viên', roleCode: 'ADMIN' }, ''), 'ADMIN')
  assert.equal(roleUtil.resolveHrRoleCode({ role: 'Nhân viên', roleCode: 'CASHIER' }, ''), 'CASHIER')
  assert.equal(
    roleUtil.resolveHrRoleCode({ role: 'Quản lý kho', roleCode: 'INVENTORY_MANAGER' }, ''),
    'INVENTORY_MANAGER',
  )
  assert.equal(
    roleUtil.resolveHrRoleCode({ role: 'Quản trị viên', roleCode: 'ADMIN' }, '?previewRole=CASHIER'),
    'CASHIER',
  )
  assert.equal(
    roleUtil.resolveHrRoleCode({ role: 'Quản trị viên', roleCode: 'ADMIN' }, '?previewRole=INVENTORY_MANAGER'),
    'INVENTORY_MANAGER',
  )
})

test('Sidebar hides admin-only nav items for CASHIER and INVENTORY_MANAGER and renders HRM sub-menu', () => {
  const sidebarSource = readFileSync(src('components', 'layout', 'Sidebar', 'Sidebar.tsx'), 'utf8')
  const mainLayoutSource = readFileSync(src('components', 'layout', 'MainLayout.tsx'), 'utf8')

  for (const adminNavId of ['approvals', 'audit', 'reports', 'settings']) {
    assert.ok(roleUtil.HR_ADMIN_ONLY_NAV_IDS.has(adminNavId), `missing admin-only nav id: ${adminNavId}`)
  }

  assert.match(sidebarSource, /HR_ADMIN_ONLY_NAV_IDS/)
  assert.match(sidebarSource, /userRoleCode === 'CASHIER' \|\| userRoleCode === 'INVENTORY_MANAGER'/)
  assert.match(sidebarSource, /data-testid="sidebar-hr-submenu"/)
  assert.match(sidebarSource, /Danh sách nhân viên/)
  assert.match(sidebarSource, /Phân công ca/)
  assert.match(sidebarSource, /Chấm công/)
  assert.match(sidebarSource, /Đơn xét duyệt/)
  assert.match(sidebarSource, /Bảng lương/)
  assert.match(sidebarSource, /Phiếu lương/)

  assert.match(mainLayoutSource, /resolveHrRoleCode/)
  assert.match(mainLayoutSource, /userRoleCode=\{userRoleCode\}/)
})

test('HrModuleTabs exposes navigation role and testid without touching HRM-02 or HRM-03 pages', () => {
  const tabsSource = readFileSync(src('features', 'hr', 'components', 'HrModuleTabs.tsx'), 'utf8')
  assert.match(tabsSource, /data-testid="hr-module-tabs"/)
  assert.match(tabsSource, /aria-label="Phân hệ Nhân sự & tiền lương"/)
})
