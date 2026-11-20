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

test('SCR-HRM-06 routes, components, and unified terminology exist without forbidden copy', () => {
  const requiredFiles = [
    ['features', 'hr', 'components', 'PayslipBreakdownCard.tsx'],
    ['features', 'hr', 'components', 'PayslipDisputePanel.tsx'],
    ['features', 'hr', 'components', 'PayslipAdminReconcilePanel.tsx'],
    ['features', 'hr', 'components', 'PayslipSourceDrawer.tsx'],
    ['features', 'hr', 'pages', 'PayslipPage.tsx'],
  ]

  for (const parts of requiredFiles) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  assert.equal(hrRoutes.hrPaths.payslip, '/hr/payslip')
  assert.equal(hrRoutes.hrPaths.payslipDetail('NV-0002'), '/hr/payslip/NV-0002')

  const routesContent = readFileSync(src('routes', 'AppRoutes.tsx'), 'utf8')
  assert.match(
    routesContent,
    /path="\/hr\/payslip"\s+element=\{<RequireSession><PayslipPage\s*\/>/,
  )
  assert.match(
    routesContent,
    /path="\/hr\/payslip\/:employeeId"\s+element=\{<RequireSession><PayslipPage\s*\/>/,
  )

  const disputePanelSource = readFileSync(
    src('features', 'hr', 'components', 'PayslipDisputePanel.tsx'),
    'utf8',
  )
  assert.match(disputePanelSource, /Đối chiếu & Giải trình phiếu lương/)
  assert.match(disputePanelSource, /Gửi yêu cầu đối chiếu/)
  assert.doesNotMatch(disputePanelSource, /Cần giải thích phiếu lương\?/)
  assert.doesNotMatch(disputePanelSource, /Gửi yêu cầu giải thích/)
})

test('SCR-HRM-06 payslip detail supports paid (06A), pending payout (06B), 3 drawers, and disputes', async () => {
  payrollService.resetHrPayrollStore()

  const paid = await payrollService.getPayslipDetail('NV-0002', '09/2026')
  assert.equal(paid.payslipCode, 'PAY-202609-NV0002')
  assert.equal(paid.payoutStatus, 'paid')
  assert.equal(paid.totalIncome, 5480000)
  assert.equal(paid.totalDeduction, 100000)
  assert.equal(paid.netPay, 5380000)
  assert.equal(paid.attendanceDays.length, 20)
  assert.equal(paid.overtimeEntries.length, 2)
  assert.equal(paid.advanceVoucher.voucherCode, 'ADV-0921')
  assert.equal(paid.disputes.length, 3)

  const statuses = new Set(paid.disputes.map((d) => d.status))
  assert.ok(statuses.has('pending_response'))
  assert.ok(statuses.has('explained'))
  assert.ok(statuses.has('approved_next_period'))

  const pending = await payrollService.getPayslipDetail('NV-0002', '10/2026')
  assert.equal(pending.payoutStatus, 'pending_payout')
  assert.equal(pending.netPay, 5380000)

  await assert.rejects(
    () =>
      payrollService.createPayslipDispute({
        employeeId: 'NV-0002',
        periodKey: '09/2026',
        category: 'allowance',
        content: '   ',
      }),
    /nội dung đối chiếu/,
  )

  const created = await payrollService.createPayslipDispute({
    employeeId: 'NV-0002',
    periodKey: '09/2026',
    category: 'allowance',
    content: 'Kiểm tra phụ cấp ca tối ngày 28/09.',
  })
  assert.equal(created.status, 'pending_response')

  const afterDispute = await payrollService.getPayslipDetail(
    'NV-0002',
    '09/2026',
  )
  assert.equal(afterDispute.disputes.length, 4)

  const resend = await payrollService.resendSinglePayslipZalo(
    'NV-0002',
    '09/2026',
  )
  assert.ok(resend.sentAt.length > 0)
})
