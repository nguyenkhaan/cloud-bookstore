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
})

after(async () => {
  await server?.close()
})

test('Phase 2: SCR-HRM-05 single-fault isolation on batch payout, unlock, draft adjustment, and Zalo send', async () => {
  payrollService.resetHrPayrollStore()

  // Single fault 1: empty employeeIds with all other payout fields valid
  await assert.rejects(
    () =>
      payrollService.executeBatchPayout({
        periodKey: '08/2026',
        employeeIds: [],
        method: 'bank_transfer',
        transactionRef: 'BANK-PAY-20260903-001',
        payoutDate: '03/09/2026',
        actorName: 'Nguyễn Minh Anh',
      }),
    /nhân viên/i,
  )

  // Single fault 2: empty transactionRef for bank_transfer with valid employeeIds & payoutDate
  await assert.rejects(
    () =>
      payrollService.executeBatchPayout({
        periodKey: '08/2026',
        employeeIds: ['NV-0002'],
        method: 'bank_transfer',
        transactionRef: '   ',
        payoutDate: '03/09/2026',
        actorName: 'Nguyễn Minh Anh',
      }),
    /mã giao dịch/i,
  )

  // Single fault 3: empty payoutDate with valid employeeIds & transactionRef
  await assert.rejects(
    () =>
      payrollService.executeBatchPayout({
        periodKey: '08/2026',
        employeeIds: ['NV-0002'],
        method: 'bank_transfer',
        transactionRef: 'BANK-PAY-20260903-001',
        payoutDate: '   ',
        actorName: 'Nguyễn Minh Anh',
      }),
    /ngày chi trả/i,
  )

  // Single fault 4: batch payout on draft period rejected
  await assert.rejects(
    () =>
      payrollService.executeBatchPayout({
        periodKey: '10/2026',
        employeeIds: ['NV-0002'],
        method: 'cash',
        transactionRef: '',
        payoutDate: '03/11/2026',
        actorName: 'Nguyễn Minh Anh',
      }),
    /duyệt/i,
  )

  // Single fault 5: Zalo send on draft period rejected
  await assert.rejects(
    () => payrollService.sendPayrollZaloPayslips('10/2026', ['NV-0002']),
    /duyệt/i,
  )

  // Single fault 6: Zalo send with empty employeeIds performs zero unintended sends
  const noOpZalo = await payrollService.sendPayrollZaloPayslips('09/2026', [])
  assert.equal(noOpZalo.kpi.zaloSentCount, 2)

  // Draft period 10/2026 allows initialize & manual adjustment and recalculates netPay
  const initialized = await payrollService.initializePayrollFromAttendance(
    '10/2026',
    'Nguyễn Thanh Tâm',
  )
  assert.ok(
    initialized.history.some((h) => h.event.includes('Đồng bộ lại từ ATT-202610')),
  )

  const adjusted = await payrollService.adjustDraftPayrollEmployee({
    periodKey: '10/2026',
    employeeId: 'NV-0002',
    bonus: 500000,
    allowance: 200000,
    deduction: 100000,
    note: 'Thưởng thêm dự án',
  })
  const phong = adjusted.rows.find((r) => r.id === 'NV-0002')
  assert.equal(phong?.netPay, 5580000)
  assert.equal(adjusted.kpi.totalNetPay, 31050000)

  // Single fault 7: manual adjustment on settled period rejected
  await assert.rejects(
    () =>
      payrollService.adjustDraftPayrollEmployee({
        periodKey: '09/2026',
        employeeId: 'NV-0002',
        bonus: 500000,
        allowance: 200000,
        deduction: 100000,
      }),
    /bản nháp/i,
  )
})

test('Phase 2: SCR-HRM-05 search/filters preserve KPI totals and next-period adjustment validates amount & draft mode', async () => {
  payrollService.resetHrPayrollStore()

  const filtered = await payrollService.listPayrollPeriod({
    periodKey: '09/2026',
    search: 'NV-0002',
  })
  assert.equal(filtered.rows.length, 1)
  assert.equal(filtered.rows[0].fullName, 'Trần Hoàng Phong')
  assert.equal(filtered.allRowsCount, 4)
  assert.equal(filtered.kpi.totalNetPay, 30850000)

  // Single fault: amount <= 0 rejected while reason & other fields are valid
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
        amount: 0,
        reason: 'Kiểm tra số tiền hợp lệ',
        mode: 'approved',
      }),
    /số tiền/i,
  )

  const draftAdj = await payrollService.createNextPeriodAdjustment({
    sourcePayrollCode: 'PAY-202609',
    sourcePeriodKey: '09/2026',
    sourceVoucherRef: 'BANK-PAY-20261003-001',
    employeeId: 'NV-0003',
    targetPeriodKey: '10/2026',
    category: 'OT',
    adjustmentType: 'add_next_period',
    amount: 105000,
    reason: 'Lưu nháp bù trừ 2 giờ OT',
    mode: 'draft',
  })
  assert.equal(draftAdj.status, 'draft')
  assert.match(draftAdj.id, /^ADJ-/)
})

test('Phase 2: SCR-HRM-06 entrypoint parity across employees, periods, dispute categories, and Zalo resend', async () => {
  payrollService.resetHrPayrollStore()

  const khoaPayslip = await payrollService.getPayslipDetail('NV-0003', '09/2026')
  assert.equal(khoaPayslip.employeeCode, 'NV-0003')
  assert.equal(khoaPayslip.netPay, 6365000)

  const linhPayslip = await payrollService.getPayslipDetail('NV-0005', '09/2026')
  assert.equal(linhPayslip.zaloStatus, 'failed')

  const resendLinh = await payrollService.resendSinglePayslipZalo(
    'NV-0005',
    '09/2026',
  )
  assert.ok(resendLinh.sentAt.length > 0)

  const linhAfterResend = await payrollService.getPayslipDetail(
    'NV-0005',
    '09/2026',
  )
  assert.equal(linhAfterResend.zaloStatus, 'sent')

  const dispute = await payrollService.createPayslipDispute({
    employeeId: 'NV-0002',
    periodKey: '09/2026',
    category: 'deduction',
    content: 'Đối chiếu phiếu tạm ứng ADV-0921.',
    attachmentName: 'adv-0921.png',
    attachmentSize: '120 KB',
  })
  assert.equal(dispute.categoryLabel, 'Khấu trừ')
  assert.equal(dispute.attachmentName, 'adv-0921.png')
  assert.equal(dispute.status, 'pending_response')
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
