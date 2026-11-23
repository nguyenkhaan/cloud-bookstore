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

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  hrRoutes = await server.ssrLoadModule('/src/features/hr/hr.route.ts')
  payrollService = await server.ssrLoadModule(
    '/src/features/hr/hr-payroll.service.ts',
  )
})

after(async () => {
  await server?.close()
})

test('SCR-HRM-05 routes, files, and forbidden card guard exist', () => {
  const requiredFiles = [
    ['features', 'hr', 'hr-payroll.type.ts'],
    ['features', 'hr', 'hr-payroll.mock.ts'],
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

test('SCR-HRM-05 period states match exact Figma figures (30.850.000đ) and draft/approve/unlock workflow', async () => {
  payrollService.resetHrPayrollStore()

  const settled = await payrollService.listPayrollPeriod({
    periodKey: '09/2026',
  })
  assert.equal(settled.status, 'settled')
  assert.equal(settled.kpi.totalNetPay, 30850000)
  assert.equal(settled.kpi.paidAmount, 30850000)
  assert.equal(settled.kpi.approvedOtHours, 14)
  assert.equal(settled.kpi.zaloSentCount, 2)
  assert.equal(settled.rows.length, 4)
  assert.equal(settled.rows[0].cashVarianceReport?.voucherCode, 'CASH-0925-02')

  // Cannot unlock settled payroll
  await assert.rejects(
    () => payrollService.unlockPayrollPeriod('09/2026', 'Thử mở khóa'),
    /đã phát sinh khoản chi/,
  )

  // Draft period 10/2026 -> approve -> unlock requires non-empty reason
  const draft = await payrollService.listPayrollPeriod({ periodKey: '10/2026' })
  assert.equal(draft.status, 'draft')
  assert.equal(draft.kpi.paidAmount, 0)

  const approved = await payrollService.approveAndLockPayroll('10/2026')
  assert.equal(approved.status, 'approved_unpaid')

  await assert.rejects(
    () => payrollService.unlockPayrollPeriod('10/2026', '   '),
    /lý do mở khóa/,
  )

  const unlocked = await payrollService.unlockPayrollPeriod(
    '10/2026',
    'Bổ sung thưởng ca tối',
  )
  assert.equal(unlocked.status, 'draft')
  assert.ok(unlocked.history.some((h) => h.event.includes('Mở khóa bảng lương')))
})

test('SCR-HRM-05 batch payout (11.745.000đ partial), Zalo send (4/4), and next-period adjustment ADJ-*', async () => {
  payrollService.resetHrPayrollStore()

  // Approved unpaid period 08/2026: Phong (5.380.000) + Khoa (6.365.000) = 11.745.000đ
  const partial = await payrollService.executeBatchPayout({
    periodKey: '08/2026',
    employeeIds: ['NV-0002', 'NV-0003'],
    method: 'bank_transfer',
    transactionRef: 'BANK-PAY-20261003-002',
    payoutDate: '03/10/2026',
    actorName: 'Nguyễn Minh Anh',
  })
  assert.equal(partial.status, 'partially_paid')
  assert.equal(partial.kpi.paidAmount, 11745000)
  assert.equal(partial.kpi.remainingAmount, 19105000)
  assert.equal(partial.paidRowsCount, 2)

  // Cash payout for remaining 2 employees generates PC-* voucher and settles period
  const settledCash = await payrollService.executeBatchPayout({
    periodKey: '08/2026',
    employeeIds: ['NV-0004', 'NV-0005'],
    method: 'cash',
    transactionRef: '',
    payoutDate: '04/10/2026',
    note: 'Chi tiền mặt đợt 2',
    actorName: 'Nguyễn Minh Anh',
  })
  assert.equal(settledCash.status, 'settled')
  assert.equal(settledCash.kpi.paidAmount, 30850000)
  assert.match(settledCash.batches[1].transactionRef, /^PC-/)

  // Zalo send on 09/2026 updates 2 -> 4/4
  const zaloSent = await payrollService.sendPayrollZaloPayslips('09/2026', [
    'NV-0004',
    'NV-0005',
  ])
  assert.equal(zaloSent.kpi.zaloSentCount, 4)

  // Next-period adjustment
  await assert.rejects(
    () =>
      payrollService.createNextPeriodAdjustment({
        sourcePayrollCode: 'PAY-202609',
        sourcePeriodKey: '09/2026',
        sourceVoucherRef: 'BANK-PAY-20261003-001',
        employeeId: 'NV-0002',
        targetPeriodKey: '10/2026',
        category: 'Phụ cấp',
        adjustmentType: 'add_next_period',
        amount: 200000,
        reason: '',
        mode: 'approved',
      }),
    /lý do/,
  )

  const adj = await payrollService.createNextPeriodAdjustment({
    sourcePayrollCode: 'PAY-202609',
    sourcePeriodKey: '09/2026',
    sourceVoucherRef: 'BANK-PAY-20261003-001',
    employeeId: 'NV-0002',
    targetPeriodKey: '10/2026',
    category: 'Phụ cấp',
    adjustmentType: 'add_next_period',
    amount: 200000,
    referenceCode: 'DC-0926-003',
    reason: 'Bù phụ cấp trách nhiệm tháng 09',
    mode: 'approved',
  })
  assert.match(adj.id, /^ADJ-/)
  assert.equal(adj.amount, 200000)
})
