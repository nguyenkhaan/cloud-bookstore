import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)

let server
let payrollService
let hrRoutes
let roleUtil
let privateClient

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  payrollService = await server.ssrLoadModule(
    '/src/features/hr/hr-payroll.service.ts',
  )
  hrRoutes = await server.ssrLoadModule('/src/features/hr/hr.route.ts')
  roleUtil = await server.ssrLoadModule('/src/features/hr/hr-role.util.ts')
  const clientMod = await server.ssrLoadModule('/src/api/client.ts')
  privateClient = clientMod.privateClient
})

after(async () => {
  await server?.close()
})

test('Phase 2: SCR-HRM-05 real service propagates backend validation/conflict errors without mock store', async () => {
  const originalPost = privateClient.post
  const originalPatch = privateClient.patch
  const calls = []

  privateClient.post = async (url, body) => {
    calls.push({ method: 'POST', url, body })
    if (url.endsWith('/payouts') && !body.transactionRef && body.method === 'BANK_TRANSFER') {
      throw new Error('Vui lòng nhập mã giao dịch ngân hàng.')
    }
    if (url.endsWith('/adjustments') && body.amount <= 0) {
      throw new Error('Số tiền điều chỉnh phải lớn hơn 0.')
    }
    return { status: 200, data: { periodKey: '03/2026', status: 'DRAFT', rows: [], batches: [], history: [] } }
  }
  privateClient.patch = async (url, body) => {
    calls.push({ method: 'PATCH', url, body })
    if (url.includes('01%2F2026')) {
      throw new Error('Chỉ có thể điều chỉnh thủ công khi bảng lương đang ở Bản nháp.')
    }
    return { status: 200, data: { periodKey: '03/2026', status: 'DRAFT', rows: [], batches: [], history: [] } }
  }

  try {
    await assert.rejects(
      () =>
        payrollService.executeBatchPayout({
          periodKey: '02/2026',
          employeeIds: ['emp-2'],
          method: 'bank_transfer',
          transactionRef: '',
          payoutDate: '03/03/2026',
          actorName: 'Admin',
        }),
      /mã giao dịch/i,
    )

    await assert.rejects(
      () =>
        payrollService.adjustDraftPayrollEmployee({
          periodKey: '01/2026',
          employeeId: 'emp-2',
          bonus: 500000,
          allowance: 200000,
          deduction: 100000,
        }),
      /bản nháp/i,
    )

    await assert.rejects(
      () =>
        payrollService.createNextPeriodAdjustment({
          sourcePayrollCode: 'PAY-202601',
          sourcePeriodKey: '01/2026',
          sourceVoucherRef: 'PAY-202601-001',
          employeeId: 'emp-2',
          targetPeriodKey: '03/2026',
          category: 'Phụ cấp',
          adjustmentType: 'add_next_period',
          amount: 0,
          reason: 'Kiểm tra số tiền hợp lệ',
          mode: 'approved',
        }),
      /số tiền/i,
    )

    await payrollService.initializePayrollFromAttendance('03/2026')
    await payrollService.sendPayrollZaloPayslips('01/2026', ['emp-2'])
    assert.ok(calls.some((c) => c.url === '/hr/payroll/periods/03%2F2026/initialize'))
    assert.ok(calls.some((c) => c.url === '/hr/payroll/periods/01%2F2026/send-zalo'))
  } finally {
    privateClient.post = originalPost
    privateClient.patch = originalPatch
  }
})

test('Phase 2: SCR-HRM-05 search/filters forward params and next-period adjustment posts draft mode', async () => {
  const originalGet = privateClient.get
  const originalPost = privateClient.post
  const getCalls = []
  const postCalls = []

  privateClient.get = async (url, config) => {
    getCalls.push({ url, config })
    return { status: 200, data: { rows: [], allRowsCount: 4, kpi: { totalNetPay: 30850000 }, batches: [], history: [] } }
  }
  privateClient.post = async (url, body) => {
    postCalls.push({ url, body })
    return { status: 201, data: { adjustmentCode: 'ADJ-202603-0001', status: body.mode, amount: body.amount } }
  }

  try {
    const filtered = await payrollService.listPayrollPeriod({
      periodKey: '01/2026',
      search: 'NV-0002',
    })
    assert.equal(filtered.allRowsCount, 4)
    assert.equal(getCalls[0].config.params.search, 'NV-0002')

    const draftAdj = await payrollService.createNextPeriodAdjustment({
      sourcePayrollCode: 'PAY-202601',
      sourcePeriodKey: '01/2026',
      sourceVoucherRef: 'PAY-202601-001',
      employeeId: 'emp-3',
      targetPeriodKey: '03/2026',
      category: 'OT',
      adjustmentType: 'add_next_period',
      amount: 105000,
      reason: 'Lưu nháp bù trừ 2 giờ OT',
      mode: 'draft',
    })
    assert.equal(draftAdj.status, 'draft')
    assert.match(draftAdj.id, /^ADJ-/)
    assert.equal(postCalls[0].body.mode, 'DRAFT')
  } finally {
    privateClient.get = originalGet
    privateClient.post = originalPost
  }
})

test('Phase 2: SCR-HRM-06 entrypoint parity hits /me, /{employeeId}, disputes, and resend-zalo', async () => {
  const originalGet = privateClient.get
  const originalPost = privateClient.post
  const calls = []

  privateClient.get = async (url) => {
    calls.push({ method: 'GET', url })
    return { status: 200, data: { hasPayslip: true, employeeCode: 'NV-0003', netPay: 6365000 } }
  }
  privateClient.post = async (url, body) => {
    calls.push({ method: 'POST', url, body })
    if (url.endsWith('/resend-zalo')) return { status: 200, data: { sentAt: '2026-02-01T06:00:00Z' } }
    return { status: 201, data: { id: 'disp-1', disputeCode: 'DC-202601-0001', status: 'PENDING_RESPONSE', category: 'DEDUCTION' } }
  }

  try {
    const myPayslip = await payrollService.getMyPayslipDetail('01/2026')
    assert.equal(myPayslip.netPay, 6365000)

    await payrollService.getEmployeePayslipDetail('emp-3', '01/2026')
    const resend = await payrollService.resendSinglePayslipZalo('entry-5', '01/2026')
    assert.ok(resend.sentAt && resend.sentAt.length > 0)

    const dispute = await payrollService.createPayslipDispute({
      entryId: 'entry-2',
      employeeId: 'emp-2',
      periodKey: '01/2026',
      category: 'deduction',
      content: 'Đối chiếu phiếu tạm ứng ADV-0109.',
    })
    assert.equal(dispute.status, 'pending_response')

    assert.equal(calls[0].url, '/hr/payslips/me')
    assert.equal(calls[1].url, '/hr/payslips/emp-3')
    assert.equal(calls[2].url, '/hr/payslips/entry-5/resend-zalo')
    assert.equal(calls[3].url, '/hr/payslips/entry-2/disputes')
  } finally {
    privateClient.get = originalGet
    privateClient.post = originalPost
  }
})

test('Phase 2: Refinement verification (no modal info notices, requests pageSize=10, no HrModuleTabs, Sidebar submenu & HRM routes intact)', () => {
  assert.equal(
    existsSync(src('features', 'hr', 'components', 'HrModuleTabs.tsx')),
    false,
  )

  const addModal = readFileSync(
    src('features', 'hr', 'components', 'AddEmployeeModal.tsx'),
    'utf8',
  )
  const editModal = readFileSync(
    src('features', 'hr', 'components', 'EditEmployeeModal.tsx'),
    'utf8',
  )
  const requestsPage = readFileSync(
    src('features', 'hr', 'pages', 'HrRequestsPage.tsx'),
    'utf8',
  )
  const sidebar = readFileSync(
    src('components', 'layout', 'Sidebar', 'Sidebar.tsx'),
    'utf8',
  )

  assert.doesNotMatch(
    addModal,
    /Nhân viên tự thiết lập mật khẩu qua email/,
  )
  assert.doesNotMatch(
    editModal,
    /Chỉ Admin được thay đổi vai trò hoặc trạng thái/,
  )
  assert.match(requestsPage, /MY_REQUESTS_PAGE_SIZE = 10/)
  assert.match(sidebar, /data-testid="sidebar-hr-submenu"/)

  for (const page of [
    'EmployeeListPage.tsx',
    'EmployeeDetailPage.tsx',
    'HrRequestsPage.tsx',
    'PayrollPage.tsx',
    'PayrollAdjustmentPage.tsx',
    'PayslipPage.tsx',
  ]) {
    const content = readFileSync(src('features', 'hr', 'pages', page), 'utf8')
    assert.doesNotMatch(content, /HrModuleTabs/, `${page} must not use HrModuleTabs`)
  }

  assert.equal(hrRoutes.hrPaths.payroll, '/hr/payroll')
  assert.equal(
    hrRoutes.hrPaths.payrollAdjustmentNew,
    '/hr/payroll/adjustments/new',
  )
  assert.equal(hrRoutes.hrPaths.payslip, '/hr/payslip')
  assert.equal(hrRoutes.hrPaths.payslipDetail('NV-0002'), '/hr/payslip/NV-0002')
  assert.equal(roleUtil.isHrAdmin('ADMIN'), true)
  assert.equal(roleUtil.isHrAdmin('CASHIER'), false)
})
