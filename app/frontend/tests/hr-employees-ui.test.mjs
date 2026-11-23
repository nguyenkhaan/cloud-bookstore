import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)

let server
let hrRoutes
let employeesService
let privateClient

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  hrRoutes = await server.ssrLoadModule('/src/features/hr/hr.route.ts')
  employeesService = await server.ssrLoadModule('/src/features/hr/hr-employees.service.ts')
  const clientMod = await server.ssrLoadModule('/src/api/client.ts')
  privateClient = clientMod.privateClient
})

after(async () => {
  await server?.close()
})

test('SCR-HRM-01 routes and feature files exist and are guarded in AppRoutes.tsx', () => {
  const requiredFiles = [
    ['features', 'hr', 'hr-employees.type.ts'],
    ['features', 'hr', 'hr-employees.mock.ts'],
    ['features', 'hr', 'hr-employees.service.ts'],
    ['features', 'hr', 'hr-employees.hook.ts'],
    ['features', 'hr', 'components', 'AddEmployeeModal.tsx'],
    ['features', 'hr', 'components', 'EditEmployeeModal.tsx'],
    ['features', 'hr', 'components', 'EmployeeRecentShiftsCard.tsx'],
    ['features', 'hr', 'pages', 'EmployeeListPage.tsx'],
    ['features', 'hr', 'pages', 'EmployeeDetailPage.tsx'],
  ]
  for (const parts of requiredFiles) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  assert.equal(hrRoutes.hrPaths.employees, '/hr/employees')
  assert.equal(hrRoutes.hrPaths.employeeDetail('NV-0002'), '/hr/employees/NV-0002')

  const routesContent = readFileSync(src('routes', 'AppRoutes.tsx'), 'utf8')
  assert.match(routesContent, /path="\/hr\/employees"\s+element=\{<RequireSession><RoleGuard screenId="hrEmployees"><EmployeeListPage\s*\/>/)
  assert.match(routesContent, /path="\/hr\/employees\/:id"\s+element=\{<RequireSession><RoleGuard screenId="hrEmployeeDetail"><EmployeeDetailPage\s*\/>/)
})

test('employee list service filters, paginates, computes KPIs, and creates new accounts', async () => {
  employeesService.resetHrEmployeesStore()

  const page1 = await employeesService.listHrEmployees({ page: 1, pageSize: 6 })
  assert.equal(page1.totalCount, 14)
  assert.equal(page1.items.length, 6)
  assert.deepEqual(page1.kpi, {
    activeCount: 12,
    newAccountsCount: 2,
    inShiftCount: 5,
    rootAdminCount: 1,
  })

  const filteredByRole = await employeesService.listHrEmployees({
    roleCode: 'INVENTORY_MANAGER',
    page: 1,
    pageSize: 6,
  })
  assert.ok(filteredByRole.totalCount > 0)
  assert.ok(filteredByRole.items.every((item) => item.roleCode === 'INVENTORY_MANAGER'))

  const filteredBySearch = await employeesService.listHrEmployees({
    search: 'NV-0002',
  })
  assert.equal(filteredBySearch.totalCount, 1)
  assert.equal(filteredBySearch.items[0].fullName, 'Trần Hoàng Phong')

  const created = await employeesService.createHrEmployee({
    fullName: 'Nguyễn Hoài An Mới',
    email: 'nv.an.moi@comicpos.vn',
    phone: '0908 123 456',
    roleCode: 'CASHIER',
    jobTitle: 'Thu ngân',
  })
  assert.equal(created.status, 'pending_activation')

  const afterCreate = await employeesService.listHrEmployees({ page: 1, pageSize: 6 })
  assert.equal(afterCreate.totalCount, 15)
  assert.equal(afterCreate.kpi.newAccountsCount, 3)
})

test('RootAdmin NV-0001 cannot be demoted or locked, and role changes require a reason + call PATCH /api/employee/{id}/role for UUIDs', async () => {
  employeesService.resetHrEmployeesStore()

  await assert.rejects(
    () =>
      employeesService.updateHrEmployee({
        id: 'NV-0001',
        fullName: 'Nguyễn Minh Anh',
        email: 'admin@comicpos.vn',
        phone: '0908 000 001',
        roleCode: 'CASHIER',
        status: 'active',
        roleChangeReason: 'Test',
      }),
    /RootAdmin/,
  )

  await assert.rejects(
    () =>
      employeesService.updateHrEmployee({
        id: 'NV-0002',
        fullName: 'Trần Hoàng Phong',
        email: 'nv.phong@comicpos.vn',
        phone: '0908 000 002',
        roleCode: 'INVENTORY_MANAGER',
        status: 'in_shift',
        roleChangeReason: '',
      }),
    /lý do đổi vai trò/i,
  )

  const originalPatch = privateClient.patch
  const calls = []
  privateClient.patch = async (url, body) => {
    calls.push({ url, body })
    return { status: 200, data: {} }
  }

  try {
    const uuid = '11111111-2222-4333-8444-555555555555'
    const result = await employeesService.changeEmployeeRole(uuid, {
      roleName: 'INVENTORY_MANAGER',
      reason: 'Điều chuyển sang quản lý kho',
    })
    assert.equal(result.source, 'api')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, `/employee/${uuid}/role`)
    assert.deepEqual(calls[0].body, {
      roleName: 'INVENTORY_MANAGER',
      reason: 'Điều chuyển sang quản lý kho',
    })
  } finally {
    privateClient.patch = originalPatch
  }
})

test('SCR-HRM-01 UI includes required data-testid hooks and excludes whitelist/resend-invite bloat', () => {
  const listSource = readFileSync(src('features', 'hr', 'pages', 'EmployeeListPage.tsx'), 'utf8')
  const detailSource = readFileSync(src('features', 'hr', 'pages', 'EmployeeDetailPage.tsx'), 'utf8')
  const addModalSource = readFileSync(src('features', 'hr', 'components', 'AddEmployeeModal.tsx'), 'utf8')
  const editModalSource = readFileSync(src('features', 'hr', 'components', 'EditEmployeeModal.tsx'), 'utf8')

  assert.match(listSource, /data-testid="hrm01-add-account-btn"/)
  assert.match(listSource, /data-testid="hrm01-search-input"/)
  assert.doesNotMatch(listSource, /HrModuleTabs/)
  assert.doesNotMatch(listSource, /Gửi lại lời mời|Whitelist/i)

  assert.match(detailSource, /data-testid="hrm01-edit-profile-btn"/)
  assert.doesNotMatch(detailSource, /HrModuleTabs/)

  assert.match(addModalSource, /data-testid="hrm01-add-submit-btn"/)
  assert.match(addModalSource, /invalid=\{Boolean\(/)
  assert.doesNotMatch(addModalSource, /Nhân viên tự thiết lập mật khẩu qua email/)

  assert.match(editModalSource, /data-testid="hrm01-edit-submit-btn"/)
  assert.match(editModalSource, /Lý do đổi vai trò/)
  assert.doesNotMatch(editModalSource, /Chỉ Admin được thay đổi vai trò hoặc trạng thái/)
})
