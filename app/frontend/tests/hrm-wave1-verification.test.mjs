import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let server
let employeesService
let requestsService
let roleUtil
let hrRoutes
let privateClient

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  employeesService = await server.ssrLoadModule('/src/features/hr/hr-employees.service.ts')
  requestsService = await server.ssrLoadModule('/src/features/hr/hr-requests.service.ts')
  roleUtil = await server.ssrLoadModule('/src/features/hr/hr-role.util.ts')
  hrRoutes = await server.ssrLoadModule('/src/features/hr/hr.route.ts')
  const clientMod = await server.ssrLoadModule('/src/api/client.ts')
  privateClient = clientMod.privateClient
})

after(async () => {
  await server?.close()
})

const employeeDto = (overrides = {}) => ({
  id: '22222222-3333-4444-8555-666666666666',
  employeeCode: 'NV-0002',
  email: 'nv.phong@comicpos.vn',
  fullName: 'Trần Hoàng Phong',
  phone: '0908 000 002',
  roleName: 'CASHIER',
  status: 'ACTIVE',
  jobTitle: 'Thu ngân',
  branchName: 'Nhà sách Mây · Cơ sở 01',
  isProtected: false,
  avatarUrl: null,
  createdAt: '2026-01-02T03:04:05Z',
  ...overrides,
})

const requestDto = (overrides = {}) => ({
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  requestCode: 'HR-20261126-XYZ999',
  type: 'ATTENDANCE_EXPLANATION',
  requesterId: '22222222-3333-4444-8555-666666666666',
  requesterCode: 'NV-0002',
  requesterName: 'Trần Hoàng Phong',
  applyDate: '2026-11-26',
  shiftNo: 2,
  targetShiftNo: null,
  replacementEmployeeId: null,
  replacementName: 'Không áp dụng',
  correctCheckInAt: '2026-11-26T08:00:00',
  correctCheckOutAt: '2026-11-26T13:05:00',
  proofUrl: null,
  reason: 'Máy chấm công mất mạng khi kết ca.',
  status: 'PENDING',
  isOwnedByCurrentUser: true,
  isRequestedByCurrentUser: true,
  reviewNote: null,
  reviewedBy: null,
  reviewedAt: null,
  history: [],
  ...overrides,
})

test('Phase 2: employee list forwards filters/pagination and keeps KPIs on empty search', async () => {
  const originalGet = privateClient.get
  const calls = []
  privateClient.get = async (url, config) => {
    calls.push({ url, config })
    const isEmpty = config?.params?.search === 'KHONG_TON_TAI_999'
    return {
      status: 200,
      data: {
        items: isEmpty ? [] : [employeeDto()],
        totalCount: isEmpty ? 0 : 1,
        page: config?.params?.page ?? 1,
        pageSize: config?.params?.pageSize ?? 6,
        totalPages: isEmpty ? 0 : 1,
        kpi: { activeCount: 12, newAccountsCount: 2, inShiftCount: 5, rootAdminCount: 1 },
      },
    }
  }

  try {
    const pageTwo = await employeesService.listHrEmployees({ page: 3, pageSize: 6 })
    assert.equal(pageTwo.page, 3)
    assert.equal(calls[0].config.params.page, 3)

    const pendingOnly = await employeesService.listHrEmployees({ status: 'pending_activation', page: 1 })
    assert.equal(calls[1].config.params.status, 'INVITED')
    assert.equal(pendingOnly.items[0].status, 'active')

    const empty = await employeesService.listHrEmployees({ search: 'KHONG_TON_TAI_999' })
    assert.equal(empty.totalCount, 0)
    assert.equal(empty.items.length, 0)
    assert.equal(empty.kpi.activeCount, 12)
  } finally {
    privateClient.get = originalGet
  }
})

test('Phase 2: getHrEmployeeById maps detail and returns null on 404', async () => {
  const originalGet = privateClient.get
  privateClient.get = async () => ({ status: 200, data: employeeDto({ employeeCode: 'NV-0002' }) })

  try {
    const employee = await employeesService.getHrEmployeeById('22222222-3333-4444-8555-666666666666')
    assert.equal(employee.code, 'NV-0002')
    assert.equal(employee.roleCode, 'CASHIER')
    assert.equal(employee.status, 'active')
  } finally {
    privateClient.get = originalGet
  }

  const originalGet404 = privateClient.get
  privateClient.get = async () => {
    const error = new Error('Not Found')
    error.isAxiosError = true
    error.response = { status: 404, data: {} }
    throw error
  }
  try {
    const missing = await employeesService.getHrEmployeeById('99999999-9999-4999-8999-999999999999')
    assert.equal(missing, null)
  } finally {
    privateClient.get = originalGet404
  }
})

test('Phase 2: updateHrEmployee PUTs the profile and PATCHes the role when it changes', async () => {
  const originalPut = privateClient.put
  const originalPatch = privateClient.patch
  const putCalls = []
  const patchCalls = []

  privateClient.put = async (url, body) => {
    putCalls.push({ url, body })
    return { status: 200, data: employeeDto({ roleName: 'CASHIER' }) }
  }
  privateClient.patch = async (url, body) => {
    patchCalls.push({ url, body })
    return {
      status: 200,
      data: {
        employeeId: '22222222-3333-4444-8555-666666666666',
        previousRole: 'CASHIER',
        currentRole: 'INVENTORY_MANAGER',
        changedAt: '2026-11-26T01:00:00Z',
      },
    }
  }

  try {
    await assert.rejects(
      () =>
        employeesService.updateHrEmployee({
          id: '22222222-3333-4444-8555-666666666666',
          fullName: 'Trần Hoàng Phong',
          email: 'nv.phong@comicpos.vn',
          phone: '0908 000 002',
          roleCode: 'INVENTORY_MANAGER',
          status: 'active',
          roleChangeReason: '',
        }),
      /lý do đổi vai trò/i,
    )

    putCalls.length = 0
    const updated = await employeesService.updateHrEmployee({
      id: '22222222-3333-4444-8555-666666666666',
      fullName: 'Trần Hoàng Phong',
      email: 'nv.phong@comicpos.vn',
      phone: '0908 000 002',
      roleCode: 'INVENTORY_MANAGER',
      status: 'active',
      roleChangeReason: 'Phân công phụ trách kho sách cũ',
    })
    assert.equal(updated.roleChanged, true)
    assert.equal(updated.roleChangeSource, 'api')
    assert.equal(updated.employee.roleCode, 'INVENTORY_MANAGER')
    assert.equal(putCalls.length, 1)
    assert.equal(patchCalls.length, 1)
    assert.equal(patchCalls[0].url, '/employee/22222222-3333-4444-8555-666666666666/role')
  } finally {
    privateClient.put = originalPut
    privateClient.patch = originalPatch
  }
})

test('Phase 2: SCR-HRM-04 maps all 3 request types and posts cancel/review to real endpoints', async () => {
  const originalPost = privateClient.post
  const calls = []
  privateClient.post = async (url, body) => {
    calls.push({ url, body })
    const fromBody = body && body.type
      ? {
          type: body.type,
          applyDate: body.applyDate,
          shiftNo: body.shiftNo,
          targetShiftNo: body.targetShiftNo ?? null,
          correctCheckInAt: body.correctCheckInAt ?? null,
          correctCheckOutAt: body.correctCheckOutAt ?? null,
          reason: body.reason,
        }
      : {}
    return {
      status: 200,
      data: requestDto({ ...fromBody, status: url.endsWith('/review') ? 'APPROVED' : 'PENDING' }),
    }
  }

  try {
    const explanation = await requestsService.createHrRequest({
      type: 'attendance_explanation',
      applyDate: '2026-11-26',
      shiftNo: 2,
      correctCheckInAt: '2026-11-26T08:00:00',
      correctCheckOutAt: '2026-11-26T13:05:00',
      reason: 'Máy chấm công mất mạng khi kết ca.',
    })
    assert.equal(calls[0].url, '/hr/requests')
    assert.equal(calls[0].body.type, 'ATTENDANCE_EXPLANATION')
    assert.equal(calls[0].body.shiftNo, 2)
    assert.equal(calls[0].body.correctCheckOutAt, '2026-11-26T13:05:00')
    assert.equal(explanation.type, 'attendance_explanation')
    assert.equal(explanation.correctTimeRange, '08:00 – 13:05')

    const swap = await requestsService.createHrRequest({
      type: 'shift_swap',
      applyDate: '2026-11-27',
      shiftNo: 1,
      targetShiftNo: 2,
      replacementEmployeeId: '33333333-4444-4555-8666-777777777777',
      reason: 'Đổi ca cá nhân.',
    })
    assert.equal(calls[1].body.type, 'SHIFT_SWAP')
    assert.equal(calls[1].body.targetShiftNo, 2)
    assert.equal(swap.targetShiftLabel, 'Ca 2')

    await requestsService.createHrRequest({
      type: 'leave',
      applyDate: '2026-11-28',
      shiftNo: 3,
      replacementEmployeeId: '33333333-4444-4555-8666-777777777777',
      reason: 'Nghỉ phép.',
    })
    assert.equal(calls[2].body.type, 'LEAVE')

    await requestsService.cancelHrRequest('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
    assert.match(calls[3].url, /\/cancel$/)

    await assert.rejects(
      () =>
        requestsService.reviewHrRequest({
          requestId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
          decision: 'rejected',
          note: '',
        }),
      /ghi chú xét duyệt/i,
    )

    const reviewed = await requestsService.reviewHrRequest({
      requestId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      decision: 'approved',
      note: 'Thiếu xác nhận ca trưởng.',
    })
    assert.match(calls[4].url, /\/review$/)
    assert.deepEqual(calls[4].body, { status: 'APPROVED', note: 'Thiếu xác nhận ca trưởng.' })
    assert.equal(reviewed.status, 'approved')
  } finally {
    privateClient.post = originalPost
  }
})

test('Phase 2: role resolution has no query-string override and hrPaths exposes Wave 1 routes', () => {
  assert.equal(
    roleUtil.resolveHrRoleCode({ role: 'Quản trị viên', roleCode: 'ADMIN' }),
    'ADMIN',
  )
  assert.equal(roleUtil.getPreviewRoleFromSearch, undefined)
  assert.equal(hrRoutes.hrPaths.root, '/hr')
  assert.equal(hrRoutes.hrPaths.employees, '/hr/employees')
  assert.equal(hrRoutes.hrPaths.requests, '/hr/requests')
  assert.equal(hrRoutes.hrPaths.shifts, '/hr/shifts')
  assert.equal(hrRoutes.hrPaths.attendance, '/hr/attendance')
  assert.equal(hrRoutes.hrPaths.personalAttendance, '/hr/attendance/personal')
})
