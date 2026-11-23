import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let server
let employeesService
let requestsService
let roleUtil
let hrRoutes

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  employeesService = await server.ssrLoadModule('/src/features/hr/hr-employees.service.ts')
  requestsService = await server.ssrLoadModule('/src/features/hr/hr-requests.service.ts')
  roleUtil = await server.ssrLoadModule('/src/features/hr/hr-role.util.ts')
  hrRoutes = await server.ssrLoadModule('/src/features/hr/hr.route.ts')
})

after(async () => {
  await server?.close()
})

test('Phase 2: employee list supports status filter, pagination, and empty search without corrupting KPIs', async () => {
  employeesService.resetHrEmployeesStore()

  const page2 = await employeesService.listHrEmployees({ page: 2, pageSize: 6 })
  assert.equal(page2.page, 2)
  assert.equal(page2.items.length, 6)
  assert.equal(page2.totalPages, 3)

  const page3 = await employeesService.listHrEmployees({ page: 3, pageSize: 6 })
  assert.equal(page3.page, 3)
  assert.equal(page3.items.length, 2)

  const pendingOnly = await employeesService.listHrEmployees({
    status: 'pending_activation',
    page: 1,
    pageSize: 6,
  })
  assert.equal(pendingOnly.totalCount, 2)
  assert.ok(pendingOnly.items.every((item) => item.status === 'pending_activation'))

  const emptySearch = await employeesService.listHrEmployees({
    search: 'KHONG_TON_TAI_999',
    page: 1,
    pageSize: 6,
  })
  assert.equal(emptySearch.totalCount, 0)
  assert.equal(emptySearch.items.length, 0)
  assert.equal(emptySearch.kpi.activeCount, 12)
})

test('Phase 2: getHrEmployeeById resolves detail shifts and rejects/handles unknown ID cleanly', async () => {
  employeesService.resetHrEmployeesStore()

  const nv0002 = await employeesService.getHrEmployeeById('NV-0002')
  assert.ok(nv0002)
  assert.equal(nv0002.code, 'NV-0002')
  assert.equal(nv0002.recentShifts.length, 14)
  assert.ok(nv0002.recentShifts.some((s) => s.status === 'missing_attendance'))

  let missingResult = null
  let threw = false
  try {
    missingResult = await employeesService.getHrEmployeeById('NV-9999')
  } catch {
    threw = true
  }
  assert.ok(threw || missingResult === null || missingResult === undefined)
})

test('Phase 2: single-fault isolation on RootAdmin NV-0001 lock protection and mock-fallback role update', async () => {
  employeesService.resetHrEmployeesStore()

  // Single fault 1: locking NV-0001 while keeping roleCode ADMIN
  await assert.rejects(
    () =>
      employeesService.updateHrEmployee({
        id: 'NV-0001',
        fullName: 'Nguyễn Minh Anh',
        email: 'admin@comicpos.vn',
        phone: '0908 000 001',
        roleCode: 'ADMIN',
        status: 'locked',
      }),
    /RootAdmin/,
  )

  // Valid update on NV-0002 with role change + reason falls back cleanly for mock ID
  const updated = await employeesService.updateHrEmployee({
    id: 'NV-0002',
    fullName: 'Trần Hoàng Phong',
    email: 'nv.phong@comicpos.vn',
    phone: '0908 000 002',
    roleCode: 'INVENTORY_MANAGER',
    jobTitle: 'Quản lý kho',
    status: 'active',
    roleChangeReason: 'Phân công phụ trách kho sách cũ',
  })
  assert.equal(updated.roleChanged, true)
  assert.equal(updated.roleChangeSource, 'mock-fallback')
  assert.equal(updated.employee.roleCode, 'INVENTORY_MANAGER')
})

test('Phase 2: SCR-HRM-04 supports all 3 request types, filters, and rejected decision single-fault checks', async () => {
  requestsService.resetHrRequestsStore()

  const explanation = await requestsService.createHrRequest({
    type: 'attendance_explanation',
    applyDate: '2026-10-26',
    currentShiftLabel: '18/10 · Ca sáng (Thiếu check-out)',
    correctTimeRange: '08:00 – 13:02',
    reason: 'Máy chấm công mất mạng khi kết ca.',
  })
  assert.equal(explanation.type, 'attendance_explanation')
  assert.equal(explanation.status, 'pending')

  // Single fault: empty note rejected for decision='rejected' as well
  await assert.rejects(
    () =>
      requestsService.reviewHrRequest({
        requestId: explanation.id,
        decision: 'rejected',
        note: '',
        reviewerName: 'Nguyễn Minh Anh',
        reviewerRoleLabel: 'Quản trị viên',
      }),
    /ghi chú xét duyệt/i,
  )

  const rejected = await requestsService.reviewHrRequest({
    requestId: explanation.id,
    decision: 'rejected',
    note: 'Thiếu xác nhận ca trưởng.',
    reviewerName: 'Nguyễn Minh Anh',
    reviewerRoleLabel: 'Quản trị viên',
  })
  assert.equal(rejected.status, 'rejected')
  assert.ok(rejected.history.some((entry) => entry.message.includes('Thiếu xác nhận ca trưởng.')))

  const filteredRejected = await requestsService.getHrRequestsSummary({ status: 'rejected' })
  assert.ok(filteredRejected.myRequests.every((item) => item.status === 'rejected'))
  assert.ok(filteredRejected.myRequests.some((item) => item.id === explanation.id))
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
