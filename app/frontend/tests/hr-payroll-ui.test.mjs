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
let hrRoutes
let payrollService
let payrollUtils
let privateClient

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  hrRoutes = await server.ssrLoadModule('/src/features/hr/hr.route.ts')
  payrollService = await server.ssrLoadModule(
    '/src/features/hr/hr-payroll.service.ts',
  )
  payrollUtils = await server.ssrLoadModule(
    '/src/features/hr/hr-payroll.utils.ts',
  )
  const clientMod = await server.ssrLoadModule('/src/api/client.ts')
  privateClient = clientMod.privateClient
})

after(async () => {
  await server?.close()
})

test('SCR-HRM-05 routes, API-backed files, and forbidden card guard exist without mock store', () => {
  const requiredFiles = [
    ['features', 'hr', 'hr-payroll.type.ts'],
    ['features', 'hr', 'hr-payroll.utils.ts'],
    ['features', 'hr', 'hr-payroll.service.ts'],
    ['features', 'hr', 'hr-payroll.hook.ts'],
    ['features', 'hr', 'components', 'PayrollTableSection.tsx'],
    ['features', 'hr', 'components', 'PayrollBottomPanels.tsx'],
    ['features', 'hr', 'components', 'PayrollUnlockModal.tsx'],
    ['features', 'hr', 'components', 'PayrollBatchPayoutModal.tsx'],
    ['features', 'hr', 'components', 'PayrollZaloPreviewModal.tsx'],
    ['features', 'hr', 'components', 'PayrollBreakdownDrawer.tsx'],
    ['features', 'hr', 'pages', 'PayrollPage.tsx'],
    ['features', 'hr', 'pages', 'PayrollAdjustmentPage.tsx'],
  ]

  for (const parts of requiredFiles) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }
  assert.equal(existsSync(src('features', 'hr', 'hr-payroll.mock.ts')), false)

  assert.equal(hrRoutes.hrPaths.payroll, '/hr/payroll')
  assert.equal(
    hrRoutes.hrPaths.payrollAdjustmentNew,
    '/hr/payroll/adjustments/new',
  )

  const routesContent = readFileSync(src('routes', 'AppRoutes.tsx'), 'utf8')
  assert.match(
    routesContent,
    /path="\/hr\/payroll"\s+element=\{<RequireSession><RoleGuard screenId="hrPayroll"><PayrollPage\s*\/>/,
  )
  assert.match(
    routesContent,
    /path="\/hr\/payroll\/adjustments\/new"\s+element=\{<RequireSession><RoleGuard screenId="hrPayrollAdjustment"><PayrollAdjustmentPage\s*\/>/,
  )

  const payrollPageSource = readFileSync(
    src('features', 'hr', 'pages', 'PayrollPage.tsx'),
    'utf8',
  )
  const adjustmentPageSource = readFileSync(
    src('features', 'hr', 'pages', 'PayrollAdjustmentPage.tsx'),
    'utf8',
  )
  assert.match(payrollPageSource, /hrm05-forbidden-card/)
  assert.match(payrollPageSource, /Bạn chưa có quyền truy cập bảng lương/)
  assert.doesNotMatch(payrollPageSource, /HrModuleTabs/)
  assert.doesNotMatch(adjustmentPageSource, /HrModuleTabs/)
})

test('SCR-HRM-05 utils format VND, Vietnamese words, and Asia/Ho_Chi_Minh timestamps accurately', () => {
  assert.equal(payrollUtils.formatVnd(30850000), '30.850.000đ')
  assert.equal(payrollUtils.formatVnd(-50000), '-50.000đ')
  assert.equal(payrollUtils.numberToVietnameseWords(0), 'Không đồng.')
  assert.match(payrollUtils.numberToVietnameseWords(5380000), /5\.380\.000 đồng\./)
  assert.equal(payrollUtils.PAYROLL_STATUS_LABELS.draft, 'Bản nháp')
  assert.equal(payrollUtils.PAYROLL_STATUS_LABELS.settled, 'Đã duyệt & Khóa')
  assert.equal(payrollUtils.formatVietnamDateTime(undefined), '-')
  assert.notEqual(payrollUtils.formatVietnamDateTime('2026-10-03T02:30:00Z'), '-')
})

test('SCR-HRM-05 payroll service forwards period queries, lifecycle mutations, batch payout, Zalo, and adjustments to real endpoints', async () => {
  const originalGet = privateClient.get
  const originalPost = privateClient.post
  const originalPatch = privateClient.patch
  const calls = []

  const sampleSummary = { periodKey: '10/2026', status: 'draft', rows: [] }

  privateClient.get = async (url, config) => {
    calls.push({ method: 'GET', url, config })
    if (url === '/hr/payroll/periods') return { status: 200, data: [{ periodKey: '10/2026' }] }
    if (url === '/hr/payroll/adjustments') return { status: 200, data: [{ id: 'ADJ-202610-0001' }] }
    return { status: 200, data: sampleSummary }
  }
  privateClient.post = async (url, body) => {
    calls.push({ method: 'POST', url, body })
    if (url === '/hr/payroll/adjustments') return { status: 201, data: { id: 'ADJ-202610-0002', amount: body.amount } }
    return { status: 200, data: sampleSummary }
  }
  privateClient.patch = async (url, body) => {
    calls.push({ method: 'PATCH', url, body })
    return { status: 200, data: sampleSummary }
  }

  try {
    await payrollService.listPayrollPeriods()
    await payrollService.listPayrollPeriod({
      periodKey: '10/2026',
      search: 'NV-0002',
      statusFilter: 'draft',
      payoutFilter: 'unpaid',
    })
    await payrollService.initializePayrollFromAttendance('10/2026')
    await payrollService.adjustDraftPayrollEmployee({
      periodKey: '10/2026',
      employeeId: 'emp-2',
      bonus: 500000,
      allowance: 200000,
      deduction: 100000,
      note: 'Thưởng dự án',
    })
    await payrollService.approveAndLockPayroll('10/2026')
    await payrollService.unlockPayrollPeriod('10/2026', 'Bổ sung thưởng ca tối')
    await payrollService.executeBatchPayout({
      periodKey: '10/2026',
      employeeIds: ['emp-2'],
      method: 'bank_transfer',
      transactionRef: 'BANK-PAY-20261003-002',
      payoutDate: '2026-11-03',
      actorName: 'Admin',
    })
    await payrollService.sendPayrollZaloPayslips('10/2026', ['emp-2'])
    await payrollService.getPayrollBreakdown('10/2026', 'emp-2')
    await payrollService.listNextPeriodAdjustments('11/2026')
    const adj = await payrollService.createNextPeriodAdjustment({
      sourcePayrollCode: 'PAY-202610',
      sourcePeriodKey: '10/2026',
      sourceVoucherRef: 'BANK-PAY-20261003-002',
      employeeId: 'emp-2',
      targetPeriodKey: '11/2026',
      category: 'Phụ cấp',
      adjustmentType: 'add_next_period',
      amount: 200000,
      reason: 'Bù phụ cấp trách nhiệm',
      mode: 'approved',
    })

    assert.equal(calls[0].url, '/hr/payroll/periods')
    assert.equal(calls[1].url, '/hr/payroll/periods/10%2F2026')
    assert.equal(calls[1].config.params.search, 'NV-0002')
    assert.equal(calls[1].config.params.status, 'draft')
    assert.equal(calls[1].config.params.payoutFilter, 'unpaid')
    assert.equal(calls[2].url, '/hr/payroll/periods/10%2F2026/initialize')
    assert.equal(calls[3].url, '/hr/payroll/periods/10%2F2026/employees/emp-2')
    assert.equal(calls[4].url, '/hr/payroll/periods/10%2F2026/approve')
    assert.equal(calls[5].url, '/hr/payroll/periods/10%2F2026/unlock')
    assert.deepEqual(calls[5].body, { reason: 'Bổ sung thưởng ca tối' })
    assert.equal(calls[6].url, '/hr/payroll/periods/10%2F2026/payouts')
    assert.equal(calls[6].body.transactionRef, 'BANK-PAY-20261003-002')
    assert.equal(calls[7].url, '/hr/payroll/periods/10%2F2026/send-zalo')
    assert.equal(calls[8].url, '/hr/payroll/periods/10%2F2026/employees/emp-2/breakdown')
    assert.equal(calls[9].url, '/hr/payroll/adjustments')
    assert.equal(calls[10].url, '/hr/payroll/adjustments')
    assert.equal(adj.amount, 200000)
  } finally {
    privateClient.get = originalGet
    privateClient.post = originalPost
    privateClient.patch = originalPatch
  }
})
