import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)

let server
let screenPolicy
let hrPayrollHooks

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  screenPolicy = await server.ssrLoadModule('/src/routes/screen-access.policy.ts')
  hrPayrollHooks = await server.ssrLoadModule('/src/features/hr/hr-payroll.hook.ts')
})

after(async () => {
  await server?.close()
})

test('AC 7: hr-payroll mock store is deleted, pure utils exist, and Wave B pages fail closed without hardcoded Admin fallback or screen codes', () => {
  assert.equal(existsSync(src('features', 'hr', 'hr-payroll.mock.ts')), false, 'hr-payroll.mock.ts must be deleted')
  assert.equal(existsSync(src('features', 'hr', 'hr-payroll.utils.ts')), true, 'hr-payroll.utils.ts must exist')

  const waveBFiles = [
    ['features', 'hr', 'hr-payroll.service.ts'],
    ['features', 'hr', 'hr-payroll.hook.ts'],
    ['features', 'hr', 'pages', 'PayrollPage.tsx'],
    ['features', 'hr', 'pages', 'PayrollAdjustmentPage.tsx'],
    ['features', 'hr', 'pages', 'PayslipPage.tsx'],
    ['features', 'hr', 'components', 'PayrollTableSection.tsx'],
    ['features', 'hr', 'components', 'PayrollBottomPanels.tsx'],
    ['features', 'hr', 'components', 'PayrollBreakdownDrawer.tsx'],
    ['features', 'hr', 'components', 'PayrollManualAdjustModal.tsx'],
    ['features', 'hr', 'components', 'PayrollBatchPayoutModal.tsx'],
    ['features', 'hr', 'components', 'PayrollUnlockModal.tsx'],
    ['features', 'hr', 'components', 'PayrollZaloPreviewModal.tsx'],
    ['features', 'hr', 'components', 'PayslipBreakdownCard.tsx'],
    ['features', 'hr', 'components', 'PayslipDisputePanel.tsx'],
    ['features', 'hr', 'components', 'PayslipAdminReconcilePanel.tsx'],
    ['features', 'hr', 'components', 'PayslipSourceDrawer.tsx'],
  ]

  const allSources = waveBFiles.map((parts) => ({
    name: parts.join('/'),
    content: readFileSync(src(...parts), 'utf8'),
  }))

  for (const file of allSources) {
    assert.doesNotMatch(file.content, /hr-payroll\.mock/, `${file.name} must not import hr-payroll.mock`)
    assert.doesNotMatch(file.content, /\b(?:SCR-HRM-|MOD-|DRAWER-)/, `${file.name} must not render screen/modal/drawer codes`)
    assert.doesNotMatch(file.content, /dữ liệu minh họa/i, `${file.name} must not contain demo placeholder copy`)
  }

  const payrollPage = readFileSync(src('features', 'hr', 'pages', 'PayrollPage.tsx'), 'utf8')
  const adjustmentPage = readFileSync(src('features', 'hr', 'pages', 'PayrollAdjustmentPage.tsx'), 'utf8')
  const payslipPage = readFileSync(src('features', 'hr', 'pages', 'PayslipPage.tsx'), 'utf8')

  assert.doesNotMatch(payrollPage, /Nguyễn Minh Anh/, 'PayrollPage must fail closed without hardcoded Admin fallback')
  assert.doesNotMatch(adjustmentPage, /Nguyễn Minh Anh/, 'PayrollAdjustmentPage must fail closed without hardcoded Admin fallback')
  assert.doesNotMatch(payslipPage, /Nguyễn Minh Anh/, 'PayslipPage must fail closed without hardcoded Admin fallback')
  assert.doesNotMatch(payslipPage, /MOCK_PAYSLIP/, 'PayslipPage must remove inline MOCK_PAYSLIP')
})

test('AC 2-7: payroll and payslip service/hooks wire real backend endpoints and OpenAPI contract includes Wave B routes', () => {
  const serviceSource = readFileSync(src('features', 'hr', 'hr-payroll.service.ts'), 'utf8')
  const apiContract = readFileSync(src('contract', 'api-contract.ts'), 'utf8')

  assert.match(serviceSource, /privateClient/, 'hr-payroll.service.ts must call privateClient')
  assert.match(serviceSource, /\/hr\/payroll\/periods/, 'hr-payroll.service.ts must call /hr/payroll/periods')
  assert.match(serviceSource, /\/hr\/payroll\/adjustments/, 'hr-payroll.service.ts must call /hr/payroll/adjustments')
  assert.match(serviceSource, /\/hr\/payslips\/me/, 'hr-payroll.service.ts must call /hr/payslips/me for SELF scope')
  assert.match(serviceSource, /\/disputes\//, 'hr-payroll.service.ts must call dispute respond endpoint')
  assert.match(serviceSource, /\/respond/, 'hr-payroll.service.ts must call /respond endpoint')
  assert.match(serviceSource, /\/resend-zalo/, 'hr-payroll.service.ts must call /resend-zalo endpoint')
  assert.doesNotMatch(serviceSource, /resetHrPayrollStore/, 'hr-payroll.service.ts must remove in-memory mock store reset helper')

  assert.equal(typeof hrPayrollHooks.useHrPayrollPeriodsListQuery, 'function', 'useHrPayrollPeriodsListQuery must be exported')
  assert.equal(typeof hrPayrollHooks.usePayrollBreakdownQuery, 'function', 'usePayrollBreakdownQuery must be exported')
  assert.equal(typeof hrPayrollHooks.useRespondPayslipDisputeMutation, 'function', 'useRespondPayslipDisputeMutation must be exported')
  assert.equal(typeof hrPayrollHooks.useMyPayslipDetailQuery, 'function', 'useMyPayslipDetailQuery must be exported')
  assert.equal(typeof hrPayrollHooks.useEmployeePayslipDetailQuery, 'function', 'useEmployeePayslipDetailQuery must be exported')

  assert.match(apiContract, /\/api\/hr\/payroll\/periods/, 'api-contract.ts must include regenerated /api/hr/payroll/periods')
  assert.match(apiContract, /\/api\/hr\/payslips\/me/, 'api-contract.ts must include regenerated /api/hr/payslips/me')
  assert.match(apiContract, /\/api\/hr\/payslips\/disputes\/\{disputeId\}\/respond/, 'api-contract.ts must include regenerated dispute respond route')
})

test('AC 5-7 & Section 5.5: SCR-HRM-05/06 UI contract wires SELF vs Admin payslip hooks, print, maker-checker, Cloudinary uploads, and Vietnam timezone', () => {
  const routesContent = readFileSync(src('routes', 'AppRoutes.tsx'), 'utf8')
  assert.match(routesContent, /path="\/hr\/payroll"\s+element=\{<RequireSession><RoleGuard screenId="hrPayroll"><PayrollPage\s*\/>/)
  assert.match(routesContent, /path="\/hr\/payroll\/adjustments\/new"\s+element=\{<RequireSession><RoleGuard screenId="hrPayrollAdjustment"><PayrollAdjustmentPage\s*\/>/)
  assert.match(routesContent, /path="\/hr\/payslip"\s+element=\{<RequireSession><RoleGuard screenId="hrPayslip"><PayslipPage\s*\/>/)
  assert.match(routesContent, /path="\/hr\/payslip\/:employeeId"\s+element=\{<RequireSession><RoleGuard screenId="hrEmployeePayslip"><PayslipPage\s*\/>/)

  const payrollPage = readFileSync(src('features', 'hr', 'pages', 'PayrollPage.tsx'), 'utf8')
  const payrollTable = readFileSync(src('features', 'hr', 'components', 'PayrollTableSection.tsx'), 'utf8')
  const payrollBottom = readFileSync(src('features', 'hr', 'components', 'PayrollBottomPanels.tsx'), 'utf8')
  const payrollCombined = `${payrollPage}\n${payrollTable}\n${payrollBottom}`
  assert.match(payrollCombined, /hrm05-period-select/)
  assert.match(payrollCombined, /hrm05-batch-payout-btn/)
  assert.match(payrollCombined, /hrm05-zalo-btn/)
  assert.match(payrollCombined, /hrm05-forbidden-card/)

  const payslipPage = readFileSync(src('features', 'hr', 'pages', 'PayslipPage.tsx'), 'utf8')
  const breakdownCard = readFileSync(src('features', 'hr', 'components', 'PayslipBreakdownCard.tsx'), 'utf8')
  const adminPanel = readFileSync(src('features', 'hr', 'components', 'PayslipAdminReconcilePanel.tsx'), 'utf8')
  const disputePanel = readFileSync(src('features', 'hr', 'components', 'PayslipDisputePanel.tsx'), 'utf8')
  const payoutModal = readFileSync(src('features', 'hr', 'components', 'PayrollBatchPayoutModal.tsx'), 'utf8')
  const adjustmentPage = readFileSync(src('features', 'hr', 'pages', 'PayrollAdjustmentPage.tsx'), 'utf8')

  assert.match(payslipPage, /useMyPayslipDetailQuery/, 'PayslipPage must use useMyPayslipDetailQuery for /hr/payslip')
  assert.match(payslipPage, /useEmployeePayslipDetailQuery/, 'PayslipPage must use useEmployeePayslipDetailQuery for /hr/payslip/:employeeId')
  assert.match(payslipPage, /window\.print\s*\(/, 'PayslipPage Tải PDF action must invoke window.print()')
  assert.doesNotMatch(payslipPage, /Đang chuẩn bị tải PDF/, 'PayslipPage Tải PDF must not show a fake toast')

  const payslipDrawersSource = `${payslipPage}\n${breakdownCard}`
  assert.match(payslipDrawersSource, /hrm06-att-drawer-btn/)
  assert.match(payslipDrawersSource, /hrm06-ot-drawer-btn/)
  assert.match(payslipDrawersSource, /hrm06-adv-drawer-btn/)

  assert.match(adminPanel, /hrm06-admin-respond-dispute-btn/, 'PayslipAdminReconcilePanel must expose Admin dispute response button')
  assert.match(adminPanel, /hrm06-admin-resend-btn/, 'PayslipAdminReconcilePanel must preserve single Zalo resend button')
  assert.match(adminPanel, /maker|chính mình|tự duyệt|tự phản hồi|của chính/i, 'PayslipAdminReconcilePanel must include a maker-checker self-response guard notice')

  assert.match(`${payoutModal}\n${adjustmentPage}`, /PAYROLL_PAYOUT_PROOF/, 'Payroll payout/adjustment UI must wire Cloudinary PAYROLL_PAYOUT_PROOF upload')
  assert.match(disputePanel, /PAYSLIP_DISPUTE_PROOF/, 'PayslipDisputePanel must wire Cloudinary PAYSLIP_DISPUTE_PROOF upload')

  const tzSources = [
    existsSync(src('features', 'hr', 'hr-payroll.utils.ts'))
      ? readFileSync(src('features', 'hr', 'hr-payroll.utils.ts'), 'utf8')
      : '',
    payrollPage,
    payslipPage,
    adminPanel,
  ].join('\n')
  assert.match(tzSources, /Asia\/Ho_Chi_Minh/, 'Wave B UI/utils must format UTC timestamps in Asia/Ho_Chi_Minh')
})

test('AC 7: screen-access.policy.ts enables dynamic api permissionMode and protected Admin ceilings for Wave B screens', () => {
  const { SCREEN_POLICIES, resolveEffectiveScreenAccess } = screenPolicy

  assert.equal(SCREEN_POLICIES.hrPayroll.permissionMode, 'api')
  assert.deepEqual(SCREEN_POLICIES.hrPayroll.protectedRoles, ['ADMIN'])
  assert.ok(
    SCREEN_POLICIES.hrPayroll.readPermissions?.some((code) => code.startsWith('HrPayroll.')),
    'hrPayroll must declare HrPayroll.* readPermissions',
  )

  assert.equal(SCREEN_POLICIES.hrPayrollAdjustment.permissionMode, 'api')
  assert.deepEqual(SCREEN_POLICIES.hrPayrollAdjustment.protectedRoles, ['ADMIN'])
  assert.ok(
    SCREEN_POLICIES.hrPayrollAdjustment.readPermissions?.some((code) => code.startsWith('HrPayroll.')),
    'hrPayrollAdjustment must declare HrPayroll.* readPermissions',
  )

  assert.equal(SCREEN_POLICIES.hrPayslip.permissionMode, 'api')
  assert.equal(SCREEN_POLICIES.hrPayslip.dataScope, 'SELF')
  assert.ok(
    SCREEN_POLICIES.hrPayslip.readPermissions?.includes('HrPayslips.GetMyPayslip'),
    'hrPayslip must include HrPayslips.GetMyPayslip in readPermissions',
  )
  assert.ok(
    SCREEN_POLICIES.hrPayslip.updatePermissions?.includes('HrPayslips.CreateDispute'),
    'hrPayslip must include HrPayslips.CreateDispute in updatePermissions',
  )

  assert.equal(SCREEN_POLICIES.hrEmployeePayslip.permissionMode, 'api')
  assert.deepEqual(SCREEN_POLICIES.hrEmployeePayslip.protectedRoles, ['ADMIN'])
  assert.ok(
    SCREEN_POLICIES.hrEmployeePayslip.readPermissions?.some((code) => code.startsWith('HrPayslips.')),
    'hrEmployeePayslip must declare HrPayslips.* readPermissions',
  )

  // Runtime policy resolution checks (Single-Fault Isolation)
  const employeeFullPayslipPerms = new Set(['HrPayslips.GetMyPayslip', 'HrPayslips.CreateDispute'])
  const employeeReadOnlyPayslipPerms = new Set(['HrPayslips.GetMyPayslip'])
  const emptyPerms = new Set()

  assert.equal(resolveEffectiveScreenAccess('hrPayslip', 'CASHIER', employeeFullPayslipPerms, 'ready'), 'U')
  assert.equal(resolveEffectiveScreenAccess('hrPayslip', 'INVENTORY_MANAGER', employeeFullPayslipPerms, 'ready'), 'U')
  assert.equal(resolveEffectiveScreenAccess('hrPayslip', 'CASHIER', employeeReadOnlyPayslipPerms, 'ready'), 'R')
  assert.equal(resolveEffectiveScreenAccess('hrPayslip', 'CASHIER', emptyPerms, 'ready'), 'N')

  assert.equal(resolveEffectiveScreenAccess('hrPayroll', 'CASHIER', employeeFullPayslipPerms, 'ready'), 'N')
  assert.equal(resolveEffectiveScreenAccess('hrPayrollAdjustment', 'INVENTORY_MANAGER', employeeFullPayslipPerms, 'ready'), 'N')
  assert.equal(resolveEffectiveScreenAccess('hrEmployeePayslip', 'CASHIER', employeeFullPayslipPerms, 'ready'), 'N')
})
