import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)

let server
let requestsService
let requestsMock

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  requestsService = await server.ssrLoadModule('/src/features/hr/hr-requests.service.ts')
  requestsMock = await server.ssrLoadModule('/src/features/hr/hr-requests.mock.ts')
})

after(async () => {
  await server?.close()
})

test('SCR-HRM-04 files exist and /hr/requests route is guarded in AppRoutes.tsx', () => {
  const requiredFiles = [
    ['features', 'hr', 'hr-requests.type.ts'],
    ['features', 'hr', 'hr-requests.mock.ts'],
    ['features', 'hr', 'hr-requests.service.ts'],
    ['features', 'hr', 'hr-requests.hook.ts'],
    ['features', 'hr', 'components', 'CreateHrRequestCard.tsx'],
    ['features', 'hr', 'components', 'ApprovalHistoryCard.tsx'],
    ['features', 'hr', 'components', 'ApprovalRequestDetailCard.tsx'],
    ['features', 'hr', 'pages', 'HrRequestsPage.tsx'],
  ]
  for (const parts of requiredFiles) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  const routesContent = readFileSync(src('routes', 'AppRoutes.tsx'), 'utf8')
  assert.match(routesContent, /path="\/hr\/requests"\s+element=\{<RequireSession><RoleGuard screenId="hrRequests"><HrRequestsPage\s*\/>/)
})

test('SCR-HRM-04 normalizes request statuses to 3 values and never uses legacy Chờ quản lý duyệt', () => {
  assert.deepEqual(requestsMock.HR_REQUEST_STATUS_LABELS, {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
  })

  const hrFiles = [
    readFileSync(src('features', 'hr', 'hr-requests.mock.ts'), 'utf8'),
    readFileSync(src('features', 'hr', 'pages', 'HrRequestsPage.tsx'), 'utf8'),
    readFileSync(src('features', 'hr', 'components', 'CreateHrRequestCard.tsx'), 'utf8'),
    readFileSync(src('features', 'hr', 'components', 'ApprovalHistoryCard.tsx'), 'utf8'),
    readFileSync(src('features', 'hr', 'components', 'ApprovalRequestDetailCard.tsx'), 'utf8'),
  ].join('\n')

  assert.doesNotMatch(hrFiles, /Chờ quản lý duyệt/)
})

test('SCR-HRM-04 service creates pending requests and updates counts/history upon review', async () => {
  requestsService.resetHrRequestsStore()

  const initial = await requestsService.getHrRequestsSummary()
  assert.equal(initial.myCount, 5)
  assert.equal(initial.pendingApprovalCount, 3)

  const created = await requestsService.createHrRequest({
    type: 'leave',
    applyDate: '2026-10-25',
    currentShiftLabel: 'Ca sáng · 08:00–13:00',
    replacementLabel: 'Lê Mai Linh · NV-0005',
    reason: 'Xin nghỉ phép giải quyết việc gia đình',
  })
  assert.equal(created.status, 'pending')

  const afterCreate = await requestsService.getHrRequestsSummary()
  assert.equal(afterCreate.myCount, 6)
  assert.equal(afterCreate.pendingApprovalCount, 4)
  assert.equal(afterCreate.myRequests[0].code, created.code)

  await assert.rejects(
    () =>
      requestsService.reviewHrRequest({
        requestId: created.id,
        decision: 'approved',
        note: '   ',
        reviewerName: 'Nguyễn Minh Anh',
        reviewerRoleLabel: 'Quản trị viên',
      }),
    /ghi chú xét duyệt/i,
  )

  const reviewed = await requestsService.reviewHrRequest({
    requestId: created.id,
    decision: 'approved',
    note: 'Đã sắp xếp nhân sự thay thế.',
    reviewerName: 'Nguyễn Minh Anh',
    reviewerRoleLabel: 'Quản trị viên',
  })
  assert.equal(reviewed.status, 'approved')
  assert.ok(reviewed.history.some((entry) => entry.message.includes('Đã sắp xếp nhân sự thay thế.')))

  const afterReview = await requestsService.getHrRequestsSummary()
  assert.equal(afterReview.pendingApprovalCount, 3)
})

test('SCR-HRM-04 UI places ApprovalHistoryCard inside Đơn cần duyệt tab and exposes required testids', () => {
  const pageSource = readFileSync(src('features', 'hr', 'pages', 'HrRequestsPage.tsx'), 'utf8')
  const createSource = readFileSync(src('features', 'hr', 'components', 'CreateHrRequestCard.tsx'), 'utf8')
  const detailSource = readFileSync(src('features', 'hr', 'components', 'ApprovalRequestDetailCard.tsx'), 'utf8')

  assert.match(pageSource, /data-testid="hrm04-tab-mine"/)
  assert.match(pageSource, /data-testid="hrm04-tab-pending"/)
  assert.match(pageSource, /isAdmin && <button/)
  assert.match(pageSource, /useHrRequestsSummaryQuery\([\s\S]*isAdmin/)
  assert.match(pageSource, /MY_REQUESTS_PAGE_SIZE = 10/)
  assert.doesNotMatch(pageSource, /HrModuleTabs/)

  const afterMineStart = pageSource.split("activeTab === 'mine' || !isAdmin ? (")[1] ?? ''
  const [mineBranch = '', pendingBranch = ''] = afterMineStart.split(') : (\n          <div className="space-y-4">')
  assert.doesNotMatch(mineBranch, /ApprovalHistoryCard/)
  assert.match(pendingBranch, /ApprovalHistoryCard/)

  assert.match(createSource, /data-testid="hrm04-submit-request-btn"/)
  assert.match(detailSource, /data-testid="hrm04-approve-btn"/)
  assert.match(detailSource, /data-testid="hrm04-reject-btn"/)
})
