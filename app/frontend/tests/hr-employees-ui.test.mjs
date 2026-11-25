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

const adminEmployeeDto = {
  id: '11111111-2222-4333-8444-555555555555',
  employeeCode: 'NV-0001',
  email: 'admin@comicpos.vn',
  fullName: 'Nguyễn Minh Anh',
  phone: '0908 000 001',
  roleName: 'ADMIN',
  status: 'ACTIVE',
  jobTitle: 'Quản trị hệ thống',
  branchName: 'Nhà sách Mây · Cơ sở 01',
  isProtected: true,
  avatarUrl: null,
  createdAt: '2026-01-02T03:04:05Z',
}

const invitedEmployeeDto = {
  ...adminEmployeeDto,
  id: '22222222-3333-4444-8555-666666666666',
  employeeCode: 'NV-0009',
  email: 'nv.an.moi@comicpos.vn',
  fullName: 'Nguyễn Hoài An Mới',
  phone: '0908 123 456',
  roleName: 'CASHIER',
  status: 'INVITED',
  isProtected: false,
}

test('SCR-HRM-01 routes and feature files exist and are guarded in AppRoutes.tsx', () => {
  const requiredFiles = [
    ['features', 'hr', 'hr-employees.type.ts'],
    ['features', 'hr', 'hr-employees.constants.ts'],
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
  assert.equal(existsSync(src('features', 'hr', 'hr-employees.mock.ts')), false)

  assert.equal(hrRoutes.hrPaths.employees, '/hr/employees')
  assert.equal(hrRoutes.hrPaths.employeeDetail('NV-0002'), '/hr/employees/NV-0002')

  const routesContent = readFileSync(src('routes', 'AppRoutes.tsx'), 'utf8')
  assert.match(routesContent, /path="\/hr\/employees"\s+element=\{<RequireSession><RoleGuard screenId="hrEmployees"><EmployeeListPage\s*\/>/)
  assert.match(routesContent, /path="\/hr\/employees\/:id"\s+element=\{<RequireSession><RoleGuard screenId="hrEmployeeDetail"><EmployeeDetailPage\s*\/>/)
})

test('employee list service reads GET /employees and maps filters, pagination and KPIs', async () => {
  const originalGet = privateClient.get
  const calls = []
  privateClient.get = async (url, config) => {
    calls.push({ url, config })
    return {
      status: 200,
      data: {
        items: [adminEmployeeDto],
        totalCount: 1,
        page: 2,
        pageSize: 6,
        totalPages: 1,
        kpi: { activeCount: 12, newAccountsCount: 2, inShiftCount: 5, rootAdminCount: 1 },
      },
    }
  }

  try {
    const result = await employeesService.listHrEmployees({
      search: 'Phong',
      roleCode: 'ADMIN',
      status: 'pending_activation',
      page: 2,
      pageSize: 6,
    })

    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, '/employees')
    assert.equal(calls[0].config.params.page, 2)
    assert.equal(calls[0].config.params.pageSize, 6)
    assert.equal(calls[0].config.params.search, 'Phong')
    assert.equal(calls[0].config.params.roleName, 'ADMIN')
    assert.equal(calls[0].config.params.status, 'INVITED')

    assert.deepEqual(result.kpi, {
      activeCount: 12,
      newAccountsCount: 2,
      inShiftCount: 5,
      rootAdminCount: 1,
    })
    assert.equal(result.items[0].code, 'NV-0001')
    assert.equal(result.items[0].isRootAdmin, true)
    assert.equal(result.items[0].status, 'active')
  } finally {
    privateClient.get = originalGet
  }
})

test('employee creation POSTs /employees and maps the INVITED onboarding status', async () => {
  const originalPost = privateClient.post
  const calls = []
  privateClient.post = async (url, body) => {
    calls.push({ url, body })
    return { status: 201, data: invitedEmployeeDto }
  }

  try {
    const created = await employeesService.createHrEmployee({
      fullName: 'Nguyễn Hoài An Mới',
      email: 'nv.an.moi@comicpos.vn',
      phone: '0908 123 456',
      roleCode: 'CASHIER',
      jobTitle: 'Thu ngân',
    })

    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, '/employees')
    assert.deepEqual(calls[0].body, {
      email: 'nv.an.moi@comicpos.vn',
      fullName: 'Nguyễn Hoài An Mới',
      phone: '0908 123 456',
      roleName: 'CASHIER',
      jobTitle: 'Thu ngân',
    })
    assert.equal(created.status, 'pending_activation')
    assert.equal(created.code, 'NV-0009')
  } finally {
    privateClient.post = originalPost
  }
})

test('role changes require a reason and PATCH /employee/{id}/role', async () => {
  const originalPatch = privateClient.patch
  const calls = []
  privateClient.patch = async (url, body) => {
    calls.push({ url, body })
    return {
      status: 200,
      data: {
        employeeId: '11111111-2222-4333-8444-555555555555',
        previousRole: 'CASHIER',
        currentRole: 'INVENTORY_MANAGER',
        changedAt: '2026-11-26T01:00:00Z',
      },
    }
  }

  try {
    await assert.rejects(
      () =>
        employeesService.changeEmployeeRole('11111111-2222-4333-8444-555555555555', {
          roleName: 'INVENTORY_MANAGER',
          reason: '',
        }),
      /lý do đổi vai trò/i,
    )

    const result = await employeesService.changeEmployeeRole(
      '11111111-2222-4333-8444-555555555555',
      { roleName: 'INVENTORY_MANAGER', reason: 'Điều chuyển sang quản lý kho' },
    )
    assert.equal(result.source, 'api')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, '/employee/11111111-2222-4333-8444-555555555555/role')
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
  assert.match(detailSource, /data-testid="hrm01-resend-setup-btn"/)
  assert.doesNotMatch(detailSource, /HrModuleTabs/)

  assert.match(addModalSource, /data-testid="hrm01-add-submit-btn"/)
  assert.match(addModalSource, /invalid=\{Boolean\(/)
  assert.doesNotMatch(addModalSource, /Nhân viên tự thiết lập mật khẩu qua email/)

  assert.match(editModalSource, /data-testid="hrm01-edit-submit-btn"/)
  assert.match(editModalSource, /Lý do đổi vai trò/)
  assert.doesNotMatch(editModalSource, /Chỉ Admin được thay đổi vai trò hoặc trạng thái/)
})
