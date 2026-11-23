import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)

let server
let roleUtil
let sidebarModule

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  roleUtil = await server.ssrLoadModule('/src/features/hr/hr-role.util.ts')
  sidebarModule = await server.ssrLoadModule('/src/components/layout/Sidebar/Sidebar.tsx')
})

after(async () => {
  await server?.close()
})

test('resolveHrRoleCode uses only normalized AuthUser role data', () => {
  assert.equal(roleUtil.resolveHrRoleCode({ role: 'Quản trị viên', roleCode: 'ADMIN' }), 'ADMIN')
  assert.equal(roleUtil.resolveHrRoleCode({ role: 'Thu ngân', roleCode: 'CASHIER' }), 'CASHIER')
  assert.equal(
    roleUtil.resolveHrRoleCode({ role: 'Quản lý kho', roleCode: 'INVENTORY_MANAGER' }),
    'INVENTORY_MANAGER',
  )
  assert.equal(roleUtil.getPreviewRoleFromSearch, undefined)
})

test('Sidebar follows the shared top-level and HR child access matrix', () => {
  const sidebarSource = readFileSync(src('components', 'layout', 'Sidebar', 'Sidebar.tsx'), 'utf8')
  const mainLayoutSource = readFileSync(src('components', 'layout', 'MainLayout.tsx'), 'utf8')

  const expectedTopLevel = {
    ADMIN: ['overview', 'pos', 'inventory', 'warehouse', 'customers', 'hr', 'approvals', 'audit', 'reports', 'settings'],
    CASHIER: ['overview', 'pos', 'inventory', 'customers', 'hr', 'approvals', 'settings'],
    INVENTORY_MANAGER: ['overview', 'pos', 'inventory', 'warehouse', 'customers', 'hr', 'approvals', 'audit', 'settings'],
  }
  const expectedHrChildren = {
    ADMIN: ['hr-employees', 'hr-shifts', 'hr-attendance', 'hr-personal-attendance', 'hr-requests', 'hr-payroll', 'hr-payslip'],
    CASHIER: ['hr-shifts', 'hr-personal-attendance', 'hr-requests', 'hr-payslip'],
    INVENTORY_MANAGER: ['hr-shifts', 'hr-personal-attendance', 'hr-requests', 'hr-payslip'],
  }

  for (const [role, expected] of Object.entries(expectedTopLevel)) {
    assert.deepEqual(sidebarModule.visibleNavItemIdsFor(role), expected, role)
    assert.deepEqual(sidebarModule.visibleHrSubNavItemIdsFor(role), expectedHrChildren[role], role)
  }

  assert.equal(sidebarModule.canAccessNavItem('approvals', 'CASHIER'), true)
  assert.equal(sidebarModule.canAccessNavItem('settings', 'INVENTORY_MANAGER'), true)

  assert.doesNotMatch(sidebarSource, /HR_ADMIN_ONLY_NAV_IDS/)
  assert.doesNotMatch(sidebarSource, /isNonAdmin/)
  assert.match(sidebarSource, /screenId:/)
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

test('HRM pages rely strictly on Sidebar HRM sub-menu without HrModuleTabs', () => {
  assert.equal(
    existsSync(src('features', 'hr', 'components', 'HrModuleTabs.tsx')),
    false,
  )
  for (const page of [
    'EmployeeListPage.tsx',
    'EmployeeDetailPage.tsx',
    'HrRequestsPage.tsx',
    'PayrollPage.tsx',
    'PayrollAdjustmentPage.tsx',
    'PayslipPage.tsx',
  ]) {
    const content = readFileSync(src('features', 'hr', 'pages', page), 'utf8')
    assert.doesNotMatch(content, /HrModuleTabs/)
  }
})
