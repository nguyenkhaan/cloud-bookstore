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

test('SCR-HRM-06 routes, empty state, labels, and API hook wiring exist without demo placeholders', () => {
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
  assert.match(payslipPageSource, /hrm06-empty-state/)
  assert.match(payslipPageSource, /print:hidden/)
  assert.match(payslipPageSource, /print:col-span-12/)
  assert.match(payslipPageSource, /window\.print\s*\(/)

  const breakdownSource = readFileSync(
    src('features', 'hr', 'components', 'PayslipBreakdownCard.tsx'),
    'utf8',
  )
  assert.doesNotMatch(breakdownSource, /03\/11\/2026|BANK-PAY-20261003-001/)
  assert.match(breakdownSource, /formatVnd\(payslip\.mandatoryContribution\)/)

  const drawerSource = readFileSync(
    src('features', 'hr', 'components', 'PayslipSourceDrawer.tsx'),
    'utf8',
  )
  assert.doesNotMatch(drawerSource, /Bảng minh họa|Trần Hoàng Phong|Nguyễn Minh Anh|ADV-0921/)

  const adminPanelSource = readFileSync(
    src('features', 'hr', 'components', 'PayslipAdminReconcilePanel.tsx'),
    'utf8',
  )
  assert.match(adminPanelSource, /htmlFor=\{responseTextId\}/)
  assert.match(adminPanelSource, /\{isOwnDispute && \(/)

  const disputePanelSource = readFileSync(
    src('features', 'hr', 'components', 'PayslipDisputePanel.tsx'),
    'utf8',
  )
  assert.match(disputePanelSource, /Đối chiếu & Giải trình phiếu lương/)
  assert.match(disputePanelSource, /Gửi yêu cầu đối chiếu/)
  assert.doesNotMatch(disputePanelSource, /Cần giải thích phiếu lương\?/)
  assert.doesNotMatch(disputePanelSource, /Gửi yêu cầu giải thích/)
})

test('SCR-HRM-06 payslip service maps live backend PayslipDetailDto fields, drawers, disputes, and empty states accurately', async () => {
  const originalGet = privateClient.get
  const originalPost = privateClient.post
  const calls = []

  const backendSettledPayslip = {
    hasPayslip: true,
    entryId: 'entry-1',
    payslipCode: 'PAY-202601-NV0002',
    periodKey: '01/2026',
    periodRange: '01/01–31/01/2026',
    payrollCode: 'PAY-202601',
    attendanceSourceCode: 'ATT-202601',
    payrollStatus: 'SETTLED',
    paid: true,
    payoutAt: '2026-02-01T03:00:00Z',
    approvedByName: 'Admin Cloud',
    approvedAt: '2026-02-01T02:00:00Z',
    employeeId: 'emp-2',
    employeeCode: 'NV-0002',
    employeeName: 'Nhân viên B',
    employeeRoleLabel: 'Thu ngân',
    storeName: 'Nhà sách Mây',
    bankAccount: 'VCB · 123456',
    transactionRef: 'PAY-202601-001',
    standardHours: 8,
    hourlyRate: 25000,
    baseSalary: 200000,
    overtimeHours: 1,
    overtimeAmount: 37500,
    bonus: 80000,
    bonusNote: 'Thưởng doanh số',
    allowance: 0,
    allowanceNote: '',
    mandatoryContribution: 0,
    mandatoryContributionNote: '',
    taxAmount: 0,
    deduction: 50000,
    totalIncome: 317500,
    totalDeduction: 50000,
    netPay: 267500,
    zaloStatus: 'SENT',
    zaloSentAt: '2026-02-01T04:00:00Z',
    zaloLinked: true,
    availablePeriods: [{ periodKey: '01/2026', paid: true }],
    attendanceDays: [
      {
        workDate: '2026-01-09',
        shiftNo: 1,
        checkInAt: '2026-01-09T01:00:00Z',
        checkOutAt: '2026-01-09T10:30:00Z',
        standardHours: 8,
        overtimeHours: 0.5,
      },
    ],
    overtimeEntries: [
      {
        workDate: '2026-01-09',
        startAt: '2026-01-09T10:00:00Z',
        endAt: '2026-01-09T10:30:00Z',
        hours: 0.5,
        amount: 18750,
      },
    ],
    advanceVouchers: [
      {
        voucherCode: 'ADV-0109',
        content: 'Tạm ứng tháng 01',
        amount: 50000,
        createdAt: '2026-01-15T03:00:00Z',
      },
    ],
    disputes: [
      {
        id: 'disp-1',
        disputeCode: 'DC-202601-0001',
        payslipCode: 'PAY-202601-NV0002',
        employeeId: 'emp-2',
        employeeName: 'Nhân viên B',
        category: 'BASE_SALARY',
        status: 'PENDING_RESPONSE',
        content: 'Đề nghị kiểm tra lại phiếu lương.',
        submittedAt: '2026-02-02T03:00:00Z',
        ownedByActor: false,
      },
    ],
  }

  privateClient.get = async (url, config) => {
    calls.push({ method: 'GET', url, config })
    if (config?.params?.periodKey === 'empty') {
      return { status: 200, data: { hasPayslip: false, entryId: null, availablePeriods: [] } }
    }
    return { status: 200, data: backendSettledPayslip }
  }
  privateClient.post = async (url, body) => {
    calls.push({ method: 'POST', url, body })
    if (url.endsWith('/resend-zalo')) return { status: 200, data: { sentAt: '2026-02-01T05:00:00Z' } }
    if (url.endsWith('/respond')) {
      return {
        status: 200,
        data: { id: 'disp-1', disputeCode: 'DC-202601-0001', category: 'BASE_SALARY', status: 'EXPLAINED', submittedAt: '2026-02-02T03:00:00Z' },
      }
    }
    return {
      status: 201,
      data: { id: 'disp-2', disputeCode: 'DC-202601-0002', category: body.category, status: 'PENDING_RESPONSE', submittedAt: '2026-02-03T03:00:00Z' },
    }
  }

  try {
    const empty = await payrollService.getMyPayslipDetail('empty')
    assert.equal(empty.hasPayslip, false)
    assert.equal(empty.entryId, null)

    const mine = await payrollService.getMyPayslipDetail('01/2026')
    assert.equal(mine.hasPayslip, true)
    assert.equal(mine.payrollStatus, 'settled')
    assert.equal(mine.payoutStatus, 'paid')
    assert.equal(mine.zaloStatus, 'sent')
    assert.equal(mine.approvedBy, 'Admin Cloud')
    assert.doesNotMatch(mine.approvedAt, /T02:00:00Z/)
    assert.equal(mine.netPayInWords, 'Hai trăm sáu mươi bảy nghìn năm trăm đồng.')
    assert.equal(mine.availablePeriods[0].status, 'paid')
    assert.equal(mine.availablePeriods[0].statusShortLabel, 'Đã thanh toán')
    assert.equal(mine.attendanceDays[0].date, '09/01/2026')
    assert.equal(mine.attendanceDays[0].otHours, 0.5)
    assert.match(mine.attendanceDays[0].checkInOut, /08:00 - 17:30/)
    assert.equal(mine.overtimeEntries[0].date, '09/01/2026')
    assert.equal(mine.advanceVoucherCode, 'ADV-0109')
    assert.equal(mine.advanceVoucher?.amount, 50000)
    assert.equal(mine.disputes[0].status, 'pending_response')
    assert.equal(mine.disputes[0].ownedByActor, false)

    await payrollService.getEmployeePayslipDetail('emp-2', '01/2026')
    const sampleProof = {
      uploadIntentId: '11111111-2222-3333-4444-555555555555',
      publicId: 'cloud-bookstore/private/disputes/proof-1',
      version: 1,
      signature: 'sig-1',
      assetId: 'asset-1',
      format: 'png',
      bytes: 512,
    }
    const dispute = await payrollService.createPayslipDispute({
      entryId: 'entry-1',
      employeeId: 'emp-2',
      periodKey: '01/2026',
      category: 'allowance',
      content: 'Kiểm tra phụ cấp ca tối.',
      proofUpload: sampleProof,
    })
    assert.equal(dispute.status, 'pending_response')
    assert.equal(calls[3].url, '/hr/payslips/entry-1/disputes')
    assert.equal(calls[3].body.category, 'ALLOWANCE')
    assert.deepEqual(calls[3].body.proofUpload, sampleProof)

    const responded = await payrollService.respondPayslipDispute('disp-1', {
      status: 'EXPLAINED',
      adminResponse: 'Đã kiểm tra chấm công.',
    })
    assert.equal(responded.status, 'explained')

    const resend = await payrollService.resendSinglePayslipZalo('entry-1', '01/2026')
    assert.ok(resend.sentAt)
    assert.doesNotMatch(resend.sentAt, /T05:00:00Z/)
  } finally {
    privateClient.get = originalGet
    privateClient.post = originalPost
  }
})
