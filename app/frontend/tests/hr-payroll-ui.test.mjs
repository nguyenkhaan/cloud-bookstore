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

test('SCR-HRM-05 routes, API-backed files, and forbidden card guard exist without mock store or hardcoded demo copy', () => {
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
  assert.match(payrollPageSource, /useHrPayrollPeriodsListQuery/)
  assert.match(payrollPageSource, /hrm05-retry-btn/)
  assert.doesNotMatch(payrollPageSource, /HrModuleTabs/)
  assert.doesNotMatch(adjustmentPageSource, /HrModuleTabs/)
  assert.doesNotMatch(adjustmentPageSource, /PAY-202609|Trần Hoàng Phong|5\.380\.000đ|DC-0926-003/)
})

test('SCR-HRM-05 utils format VND, Vietnamese words, Asia/Ho_Chi_Minh timestamps, and next period options accurately', () => {
  assert.equal(payrollUtils.formatVnd(30850000), '30.850.000đ')
  assert.equal(payrollUtils.formatVnd(-50000), '-50.000đ')
  assert.equal(payrollUtils.numberToVietnameseWords(0), 'Không đồng.')
  assert.match(payrollUtils.numberToVietnameseWords(5380000), /5\.380\.000 đồng\./)
  assert.equal(payrollUtils.PAYROLL_STATUS_LABELS.draft, 'Bản nháp')
  assert.equal(payrollUtils.PAYROLL_STATUS_LABELS.settled, 'Đã duyệt & Khóa')
  assert.equal(payrollUtils.formatVietnamDateTime(undefined), '-')
  assert.notEqual(payrollUtils.formatVietnamDateTime('2026-10-03T02:30:00Z'), '-')
  assert.equal(payrollUtils.toIsoDateOnly('03/10/2026'), '2026-10-03')
  assert.deepEqual(payrollUtils.getNextPeriodKeys('11/2026', 2), [
    { value: '12/2026', label: 'Kỳ 12/2026' },
    { value: '01/2027', label: 'Kỳ 01/2027' },
  ])
})

test('SCR-HRM-05 payroll service forwards uppercase enums and maps backend DTO responses cleanly', async () => {
  const originalGet = privateClient.get
  const originalPost = privateClient.post
  const originalPatch = privateClient.patch
  const calls = []

  const backendSummary = {
    periodKey: '03/2026',
    payrollCode: 'PAY-202603',
    periodRangeLabel: '01/03–31/03/2026',
    attendanceSourceCode: 'ATT-202603',
    status: 'SETTLED',
    exists: true,
    approvedAt: '2026-04-01T02:00:00Z',
    approvedByName: 'Admin Cloud',
    payoutAt: '2026-04-01T03:00:00Z',
    payoutMethod: 'BANK_TRANSFER',
    transactionRef: 'BANK-20260401-001',
    payoutConfirmedByName: 'Admin Cloud',
    kpi: {
      totalNetPay: 280000,
      paidAmount: 280000,
      remainingAmount: 0,
      approvedOtHours: 1,
      zaloSentCount: 1,
      totalEmployees: 1,
      zaloUnsentCount: 0,
      zaloFailedCount: 0,
    },
    rows: [
      {
        employeeId: 'emp-2',
        entryId: 'entry-2',
        employeeCode: 'NV-0002',
        fullName: 'Nhân viên B',
        roleLabel: 'Thu ngân',
        standardHours: 8,
        hourlyRate: 25000,
        baseSalary: 200000,
        overtimeHours: 1,
        overtimeAmount: 37500,
        bonus: 42500,
        allowance: 0,
        deduction: 0,
        mandatoryContribution: 0,
        taxAmount: 0,
        netPay: 280000,
        payoutStatus: 'PAID',
        zaloStatus: 'SENT',
        zaloSentAt: '2026-04-01T04:00:00Z',
        zaloLinked: true,
        bankAccount: 'VCB · 1234',
        payoutAt: '2026-04-01T03:00:00Z',
        payoutMethod: 'BANK_TRANSFER',
        transactionRef: 'BANK-20260401-001',
        contributionNote: null,
        bonusItems: [{ label: 'Thưởng', amount: 42500, voucherCode: null }],
        allowanceItems: [],
        deductionItems: [],
      },
    ],
    allRowsCount: 1,
    paidRowsCount: 1,
    batches: [
      {
        id: 'batch-1',
        batchNumber: 1,
        method: 'BANK_TRANSFER',
        transactionRef: 'BANK-20260401-001',
        payoutAt: '2026-04-01T03:00:00Z',
        amount: 280000,
        employeeNames: ['Nhân viên B'],
        confirmedByName: 'Admin Cloud',
      },
    ],
    history: [
      {
        id: 'hist-1',
        occurredAt: '2026-04-01T02:00:00Z',
        actorName: 'Admin Cloud',
        event: 'Duyệt & Chốt bảng lương',
        result: 'Đã khóa',
      },
    ],
    pendingAdjustments: [],
  }

  privateClient.get = async (url, config) => {
    calls.push({ method: 'GET', url, config })
    if (url === '/hr/payroll/periods') {
      return {
        status: 200,
        data: [{ periodKey: '03/2026', payrollCode: 'PAY-202603', status: 'DRAFT', exists: true }],
      }
    }
    if (url === '/hr/payroll/adjustments') {
      return {
        status: 200,
        data: [{
          id: 'guid-1',
          adjustmentCode: 'ADJ-202603-0001',
          adjustmentType: 'ADD_NEXT_PERIOD',
          amount: 50000,
          status: 'APPROVED',
          createdAt: '2026-03-01T03:00:00Z',
        }],
      }
    }
    return { status: 200, data: backendSummary }
  }
  privateClient.post = async (url, body) => {
    calls.push({ method: 'POST', url, body })
    if (url === '/hr/payroll/adjustments') {
      return {
        status: 201,
        data: {
          id: 'guid-2',
          adjustmentCode: 'ADJ-202603-0002',
          adjustmentType: body.adjustmentType,
          amount: body.amount,
          status: body.mode,
          createdAt: '2026-03-01T04:00:00Z',
        },
      }
    }
    return { status: 200, data: backendSummary }
  }
  privateClient.patch = async (url, body) => {
    calls.push({ method: 'PATCH', url, body })
    return { status: 200, data: backendSummary }
  }

  try {
    const periods = await payrollService.listPayrollPeriods()
    assert.equal(periods[0].status, 'draft')

    const period = await payrollService.listPayrollPeriod({
      periodKey: '03/2026',
      search: 'NV-0002',
      statusFilter: 'draft',
      payoutFilter: 'unpaid',
    })
    assert.equal(period.status, 'settled')
    assert.equal(period.approvedBy, 'Admin Cloud')
    assert.equal(period.payoutMethod, 'bank_transfer')
    assert.equal(period.rows[0].id, 'emp-2')
    assert.equal(period.rows[0].payoutStatus, 'paid')
    assert.equal(period.rows[0].zaloStatus, 'sent')
    assert.doesNotMatch(period.approvedAt ?? '', /T02:00:00Z/)
    assert.equal(period.batches[0].method, 'bank_transfer')

    await payrollService.initializePayrollFromAttendance('03/2026')
    await payrollService.adjustDraftPayrollEmployee({
      periodKey: '03/2026',
      employeeId: 'emp-2',
      bonus: 500000,
      allowance: 200000,
      deduction: 100000,
      note: 'Thưởng dự án',
    })
    await payrollService.approveAndLockPayroll('03/2026')
    await payrollService.unlockPayrollPeriod('03/2026', 'Bổ sung thưởng ca tối')
    await payrollService.executeBatchPayout({
      periodKey: '03/2026',
      employeeIds: ['emp-2'],
      method: 'bank_transfer',
      transactionRef: 'BANK-PAY-20261003-002',
      payoutDate: '03/11/2026',
      actorName: 'Admin',
    })
    await payrollService.sendPayrollZaloPayslips('03/2026', ['emp-2'])
    await payrollService.getPayrollBreakdown('03/2026', 'emp-2')
    const adjustments = await payrollService.listNextPeriodAdjustments('04/2026')
    assert.equal(adjustments[0].id, 'ADJ-202603-0001')
    assert.equal(adjustments[0].adjustmentType, 'add_next_period')
    assert.equal(adjustments[0].status, 'approved')

    const adj = await payrollService.createNextPeriodAdjustment({
      sourcePayrollCode: 'PAY-202603',
      sourcePeriodKey: '03/2026',
      sourceVoucherRef: 'BANK-PAY-20261003-002',
      employeeId: 'emp-2',
      targetPeriodKey: '04/2026',
      category: 'Phụ cấp',
      adjustmentType: 'add_next_period',
      amount: 200000,
      reason: 'Bù phụ cấp trách nhiệm',
      mode: 'approved',
    })

    assert.equal(calls[1].url, '/hr/payroll/periods/03%2F2026')
    assert.equal(calls[1].config.params.status, 'DRAFT')
    assert.equal(calls[6].body.method, 'BANK_TRANSFER')
    assert.equal(calls[6].body.payoutDate, '2026-11-03')
    assert.equal(calls[10].body.adjustmentType, 'ADD_NEXT_PERIOD')
    assert.equal(calls[10].body.mode, 'APPROVED')
    assert.equal(adj.id, 'ADJ-202603-0002')
    assert.equal(adj.status, 'approved')
  } finally {
    privateClient.get = originalGet
    privateClient.post = originalPost
    privateClient.patch = originalPatch
  }
})
