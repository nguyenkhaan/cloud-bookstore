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
let requestsConstants
let privateClient

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  requestsService = await server.ssrLoadModule('/src/features/hr/hr-requests.service.ts')
  requestsConstants = await server.ssrLoadModule('/src/features/hr/hr-requests.constants.ts')
  const clientMod = await server.ssrLoadModule('/src/api/client.ts')
  privateClient = clientMod.privateClient
})

after(async () => {
  await server?.close()
})

const pendingRequestDto = {
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  requestCode: 'HR-20261118-ABC123',
  type: 'LEAVE',
  requesterId: '11111111-2222-4333-8444-555555555555',
  requesterCode: 'NV-0002',
  requesterName: 'Trần Hoàng Phong',
  applyDate: '2026-11-20',
  shiftNo: 1,
  targetShiftNo: null,
  replacementEmployeeId: '22222222-3333-4444-8555-666666666666',
  replacementName: 'Lê Mai Linh',
  correctCheckInAt: null,
  correctCheckOutAt: null,
  proofUrl: null,
  reason: 'Xin nghỉ phép',
  status: 'PENDING',
  isOwnedByCurrentUser: true,
  isRequestedByCurrentUser: true,
  reviewNote: null,
  reviewedBy: null,
  reviewedAt: null,
  history: [
    {
      id: 'hist-1',
      action: 'SUBMITTED',
      note: null,
      occurredAt: '2026-11-18T02:00:00Z',
      actorName: 'Trần Hoàng Phong',
    },
  ],
}

test('SCR-HRM-04 files exist and /hr/requests route is guarded in AppRoutes.tsx', () => {
  const requiredFiles = [
    ['features', 'hr', 'hr-requests.type.ts'],
    ['features', 'hr', 'hr-requests.constants.ts'],
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
  assert.equal(existsSync(src('features', 'hr', 'hr-requests.mock.ts')), false)

  const routesContent = readFileSync(src('routes', 'AppRoutes.tsx'), 'utf8')
  assert.match(routesContent, /path="\/hr\/requests"\s+element=\{<RequireSession><RoleGuard screenId="hrRequests"><HrRequestsPage\s*\/>/)
})

test('SCR-HRM-04 status labels cover all lifecycle states and never use legacy Chờ quản lý duyệt', () => {
  assert.deepEqual(requestsConstants.HR_REQUEST_STATUS_LABELS, {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    cancelled: 'Đã hủy',
  })

  const hrFiles = [
    readFileSync(src('features', 'hr', 'hr-requests.service.ts'), 'utf8'),
    readFileSync(src('features', 'hr', 'pages', 'HrRequestsPage.tsx'), 'utf8'),
    readFileSync(src('features', 'hr', 'components', 'CreateHrRequestCard.tsx'), 'utf8'),
    readFileSync(src('features', 'hr', 'components', 'ApprovalHistoryCard.tsx'), 'utf8'),
    readFileSync(src('features', 'hr', 'components', 'ApprovalRequestDetailCard.tsx'), 'utf8'),
  ].join('\n')

  assert.doesNotMatch(hrFiles, /Chờ quản lý duyệt/)
})

test('SCR-HRM-04 summary reads scoped requests, create/cancel/review hit the real endpoints', async () => {
  const originalGet = privateClient.get
  const originalPost = privateClient.post
  const getCalls = []
  const postCalls = []

  privateClient.get = async (url, config) => {
    getCalls.push({ url, config })
    const isPending = config?.params?.scope === 'pending'
    return {
      status: 200,
      data: {
        myRequests: isPending ? [] : [pendingRequestDto],
        approvalQueue: isPending ? [pendingRequestDto] : [],
        myCount: 5,
        pendingApprovalCount: 3,
      },
    }
  }
  privateClient.post = async (url, body) => {
    postCalls.push({ url, body })
    const status = url.endsWith('/review')
      ? 'APPROVED'
      : url.endsWith('/cancel')
        ? 'CANCELLED'
        : 'PENDING'
    return {
      status: 200,
      data: { ...pendingRequestDto, status },
    }
  }

  try {
    const summary = await requestsService.getHrRequestsSummary({}, {}, true)
    assert.equal(getCalls.length, 2)
    assert.equal(getCalls[0].url, '/hr/requests')
    assert.equal(getCalls[0].config.params.scope, 'mine')
    assert.equal(getCalls[1].config.params.scope, 'pending')
    assert.equal(summary.myCount, 5)
    assert.equal(summary.pendingApprovalCount, 3)
    assert.equal(summary.myRequests[0].code, 'HR-20261118-ABC123')
    assert.equal(summary.myRequests[0].status, 'pending')
    assert.equal(summary.approvalQueue.length, 1)

    const mineOnly = await requestsService.getHrRequestsSummary({}, {}, false)
    assert.equal(getCalls.length, 3)
    assert.equal(mineOnly.approvalQueue.length, 0)

    const created = await requestsService.createHrRequest({
      type: 'leave',
      applyDate: '2026-11-20',
      shiftNo: 1,
      reason: 'Xin nghỉ phép',
    })
    assert.equal(postCalls[0].url, '/hr/requests')
    assert.deepEqual(postCalls[0].body, {
      type: 'LEAVE',
      applyDate: '2026-11-20',
      shiftNo: 1,
      targetShiftNo: null,
      replacementEmployeeId: null,
      correctCheckInAt: null,
      correctCheckOutAt: null,
      reason: 'Xin nghỉ phép',
      proofUpload: null,
    })
    assert.equal(created.status, 'pending')

    await requestsService.cancelHrRequest(pendingRequestDto.id)
    assert.equal(postCalls[1].url, `/hr/requests/${pendingRequestDto.id}/cancel`)

    await assert.rejects(
      () =>
        requestsService.reviewHrRequest({
          requestId: pendingRequestDto.id,
          decision: 'approved',
          note: '   ',
        }),
      /ghi chú xét duyệt/i,
    )

    const reviewed = await requestsService.reviewHrRequest({
      requestId: pendingRequestDto.id,
      decision: 'approved',
      note: 'Đã sắp xếp nhân sự thay thế.',
    })
    assert.equal(postCalls[2].url, `/hr/requests/${pendingRequestDto.id}/review`)
    assert.deepEqual(postCalls[2].body, {
      status: 'APPROVED',
      note: 'Đã sắp xếp nhân sự thay thế.',
    })
    assert.equal(reviewed.status, 'approved')
  } finally {
    privateClient.get = originalGet
    privateClient.post = originalPost
  }
})

test('SCR-HRM-04 UI places cancel + maker-checker controls and keeps ApprovalHistoryCard in the pending tab', () => {
  const pageSource = readFileSync(src('features', 'hr', 'pages', 'HrRequestsPage.tsx'), 'utf8')
  const createSource = readFileSync(src('features', 'hr', 'components', 'CreateHrRequestCard.tsx'), 'utf8')
  const detailSource = readFileSync(src('features', 'hr', 'components', 'ApprovalRequestDetailCard.tsx'), 'utf8')

  assert.match(pageSource, /data-testid="hrm04-tab-mine"/)
  assert.match(pageSource, /data-testid="hrm04-tab-pending"/)
  assert.match(pageSource, /data-testid="hrm04-cancel-request-btn"/)
  assert.match(pageSource, /isAdmin &&/)
  assert.match(pageSource, /useHrRequestsSummaryQuery\([\s\S]*isAdmin/)
  assert.match(pageSource, /MY_REQUESTS_PAGE_SIZE = 10/)
  assert.doesNotMatch(pageSource, /HrModuleTabs/)

  assert.match(createSource, /data-testid="hrm04-submit-request-btn"/)
  assert.doesNotMatch(createSource, /Lưu nháp|Số ngày nghỉ phép còn lại|Tệp minh chứng\.pdf/)

  assert.match(detailSource, /maker-checker|người tạo|chính mình/i)
  assert.match(detailSource, /data-testid="hrm04-approve-btn"/)
  assert.match(detailSource, /data-testid="hrm04-reject-btn"/)
  assert.match(detailSource, /disabled=\{!canReview\}/)
})
