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
  const clientMod = await server.ssrLoadModule('/src/api/client.ts')
  privateClient = clientMod.privateClient
})

after(async () => {
  await server?.close()
})

test('SCR-HRM-06 routes, components, and API hook wiring exist without inline MOCK_PAYSLIP', () => {
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
    /path="\/hr\/payslip"\s+element=\{<RequireSession><RoleGuard screenId="hrPayslip"><PayslipPage\s*\/>/,
  )
  assert.match(
    routesContent,
    /path="\/hr\/payslip\/:employeeId"\s+element=\{<RequireSession><RoleGuard screenId="hrEmployeePayslip"><PayslipPage\s*\/>/,
  )

  const payslipPageSource = readFileSync(
    src('features', 'hr', 'pages', 'PayslipPage.tsx'),
    'utf8',
  )
  assert.doesNotMatch(payslipPageSource, /HrModuleTabs/)
  assert.doesNotMatch(payslipPageSource, /MOCK_PAYSLIP/)
  assert.match(payslipPageSource, /useMyPayslipDetailQuery/)
  assert.match(payslipPageSource, /useEmployeePayslipDetailQuery/)
  assert.match(payslipPageSource, /window\.print\s*\(/)

  const disputePanelSource = readFileSync(
    src('features', 'hr', 'components', 'PayslipDisputePanel.tsx'),
    'utf8',
  )
  assert.match(disputePanelSource, /Đối chiếu & Giải trình phiếu lương/)
  assert.match(disputePanelSource, /Gửi yêu cầu đối chiếu/)
  assert.doesNotMatch(disputePanelSource, /Cần giải thích phiếu lương\?/)
  assert.doesNotMatch(disputePanelSource, /Gửi yêu cầu giải thích/)
})

test('SCR-HRM-06 payslip service calls SELF /me, admin employee endpoint, dispute create/respond, and Zalo resend', async () => {
  const originalGet = privateClient.get
  const originalPost = privateClient.post
  const calls = []

  const samplePayslip = {
    payslipCode: 'PAY-202609-NV0002',
    periodKey: '09/2026',
    payoutStatus: 'paid',
    totalIncome: 5480000,
    totalDeduction: 100000,
    netPay: 5380000,
    disputes: [],
  }

  privateClient.get = async (url, config) => {
    calls.push({ method: 'GET', url, config })
    return { status: 200, data: samplePayslip }
  }
  privateClient.post = async (url, body) => {
    calls.push({ method: 'POST', url, body })
    if (url.endsWith('/resend-zalo')) return { status: 200, data: { sentAt: '2026-10-03T05:00:00Z' } }
    if (url.endsWith('/respond')) return { status: 200, data: { id: 'disp-1', status: 'EXPLAINED' } }
    return { status: 201, data: { id: 'disp-1', status: 'pending_response' } }
  }

  try {
    const mine = await payrollService.getMyPayslipDetail('09/2026')
    assert.equal(mine.netPay, 5380000)

    await payrollService.getEmployeePayslipDetail('emp-2', '09/2026')
    const dispute = await payrollService.createPayslipDispute({
      employeeId: 'entry-2',
      periodKey: '09/2026',
      category: 'allowance',
      content: 'Kiểm tra phụ cấp ca tối ngày 28/09.',
    })
    assert.equal(dispute.status, 'pending_response')

    await payrollService.respondPayslipDispute('disp-1', {
      status: 'EXPLAINED',
      adminResponse: 'Đã kiểm tra chấm công.',
    })

    const resend = await payrollService.resendSinglePayslipZalo('entry-2', '09/2026')
    assert.ok(resend.sentAt)

    assert.equal(calls[0].url, '/hr/payslips/me')
    assert.equal(calls[0].config.params.periodKey, '09/2026')
    assert.equal(calls[1].url, '/hr/payslips/emp-2')
    assert.equal(calls[2].url, '/hr/payslips/entry-2/disputes')
    assert.equal(calls[3].url, '/hr/payslips/disputes/disp-1/respond')
    assert.equal(calls[4].url, '/hr/payslips/entry-2/resend-zalo')
  } finally {
    privateClient.get = originalGet
    privateClient.post = originalPost
  }
})
