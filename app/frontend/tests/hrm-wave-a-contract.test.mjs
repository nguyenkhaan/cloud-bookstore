import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)

let server
let employeeService
let privateClient

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  employeeService = await server.ssrLoadModule('/src/features/hr/hr-employees.service.ts')
  ;({ privateClient } = await server.ssrLoadModule('/src/api/client.ts'))
})

after(async () => {
  await server?.close()
})

test('SCR-HRM-01 employee listing reads the real employee API', async () => {
  const originalGet = privateClient.get
  const calls = []
  privateClient.get = async (url, config) => {
    calls.push({ url, config })
    return { status: 200, data: { items: [], totalCount: 0, page: 1, pageSize: 6, totalPages: 0, kpi: { activeCount: 0, newAccountsCount: 0, inShiftCount: 0, rootAdminCount: 0 } } }
  }

  try {
    await employeeService.listHrEmployees({ page: 1, pageSize: 6 })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, '/employees')
    assert.equal(calls[0].config.params.page, 1)
    assert.equal(calls[0].config.params.pageSize, 6)
  } finally {
    privateClient.get = originalGet
  }
})

test('SCR-HRM-01 employee screens fail closed and use only real API hooks', () => {
  const featureFiles = [
    ['features', 'hr', 'pages', 'EmployeeListPage.tsx'],
    ['features', 'hr', 'pages', 'EmployeeDetailPage.tsx'],
    ['features', 'hr', 'hr-employees.hook.ts'],
    ['features', 'hr', 'hr-employees.service.ts'],
  ].map((parts) => readFileSync(src(...parts), 'utf8'))
  const screens = featureFiles.slice(0, 2).join('\n')
  const pages = featureFiles.slice(0, 2)

  assert.doesNotMatch(pages[0], /Nguyễn Minh Anh/)
  assert.doesNotMatch(pages[1], /Nguyễn Minh Anh/)
  assert.doesNotMatch(featureFiles.join('\n'), /hr-employees\.mock/)
  assert.match(featureFiles[2], /useAuth/)
  assert.doesNotMatch(screens, /Gửi lại lời mời|Whitelist/i)
  assert.match(featureFiles[1], /hrm01-resend-setup-btn/)
})

test('SCR-HRM-04 requests route uses real request API and supports all staff options', () => {
  const route = readFileSync(src('routes', 'AppRoutes.tsx'), 'utf8')
  const page = readFileSync(src('features', 'hr', 'pages', 'HrRequestsPage.tsx'), 'utf8')
  const hook = readFileSync(src('features', 'hr', 'hr-requests.hook.ts'), 'utf8')
  const service = readFileSync(src('features', 'hr', 'hr-requests.service.ts'), 'utf8')
  const create = readFileSync(src('features', 'hr', 'components', 'CreateHrRequestCard.tsx'), 'utf8')

  assert.match(route, /path="\/hr\/requests"\s+element=\{<RequireSession><RoleGuard screenId="hrRequests"><HrRequestsPage\s*\/>/)
  assert.match(page, /data-testid="hrm04-tab-mine"/)
  assert.match(page, /data-testid="hrm04-tab-pending"/)
  assert.match(page, /isAdmin &&/)
  assert.match(hook, /useHrRequestOptionsQuery/)
  assert.match(service, /\/hr\/requests\/options/)
  assert.doesNotMatch([hook, service, page, create].join('\n'), /hr-requests\.mock/)
  assert.doesNotMatch(create, /Lưu nháp|Số ngày nghỉ phép còn lại|Tệp minh chứng\.pdf/)
})

test('SCR-HRM-04 cancellation and maker-checker controls are guarded in the UI contract', () => {
  const page = readFileSync(src('features', 'hr', 'pages', 'HrRequestsPage.tsx'), 'utf8')
  const hook = readFileSync(src('features', 'hr', 'hr-requests.hook.ts'), 'utf8')
  const service = readFileSync(src('features', 'hr', 'hr-requests.service.ts'), 'utf8')
  const detail = readFileSync(src('features', 'hr', 'components', 'ApprovalRequestDetailCard.tsx'), 'utf8')

  assert.match(page, /data-testid="hrm04-cancel-request-btn"/)
  assert.match(hook, /useCancelHrRequestMutation/)
  assert.match(service, /\/cancel/)
  assert.match(detail, /maker|người tạo|chính mình/i)
  assert.match(detail, /data-testid="hrm04-approve-btn"/)
  assert.match(detail, /data-testid="hrm04-reject-btn"/)
  assert.match(detail, /disabled=\{[^}]*canReview/)
})

test('SCR-HRM-01 and SCR-HRM-04 screen policies derive access from backend permission codes', () => {
  const policy = readFileSync(src('routes', 'screen-access.policy.ts'), 'utf8')
  const auth = readFileSync(src('context', 'AuthProvider.ts'), 'utf8')

  assert.match(policy, /hrEmployees:[\s\S]*?permissionMode: 'api',[\s\S]*?readPermissions: \['Employees\.[^']+'\],[\s\S]*?updatePermissions: \[[^\]]*'Employees\.[^']+'[^\]]*\],[\s\S]*?protectedRoles: \['ADMIN'\]/)
  assert.match(policy, /hrEmployeeDetail:[\s\S]*?permissionMode: 'api',[\s\S]*?readPermissions: \['Employees\.[^']+'\],[\s\S]*?protectedRoles: \['ADMIN'\]/)
  assert.match(policy, /hrRequests:[\s\S]*?permissionMode: 'api',[\s\S]*?readPermissions: \['HrRequests\.[^']+'\],[\s\S]*?updatePermissions: \[[^\]]*'HrRequests\.[^']+'[^\]]*\]/)
  assert.match(auth, /employeeCode/)
})
