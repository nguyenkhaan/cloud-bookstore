import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let server
let policy

before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { hmr: false, middlewareMode: true },
  })
  policy = await server.ssrLoadModule('/src/routes/screen-access.policy.ts')
})

after(async () => {
  await server?.close()
})

const matrix = {
  login: ['N', 'N', 'N'],
  register: ['N', 'N', 'N'],
  verifyRegister: ['N', 'N', 'N'],
  forgotPassword: ['N', 'N', 'N'],
  resetPassword: ['N', 'N', 'N'],
  changePassword: ['R,U', 'R,U', 'R,U'],
  profile: ['R,U', 'R,U', 'R,U'],
  dashboard: ['R', 'R', 'R'],
  pos: ['R,U', 'R,U', 'N'],
  posSale: ['R,U', 'R,U', 'N'],
  posRental: ['R,U', 'R,U', 'N'],
  posRenewal: ['R,U', 'R,U', 'N'],
  posReturn: ['R,U', 'R,U', 'N'],
  posBuyback: ['R,U', 'R,U', 'R,U'],
  posCustomerDisplay: ['R', 'R', 'N'],
  posShift: ['R,U', 'R,U', 'N'],
  customers: ['R,U', 'R,U', 'R,U'],
  customerDetail: ['R', 'R,U', 'R'],
  hr: ['R', 'R', 'R'],
  hrEmployees: ['N', 'R,U', 'N'],
  hrEmployeeDetail: ['N', 'R,U', 'N'],
  hrShifts: ['R', 'R,U', 'R'],
  hrAttendance: ['R', 'R,U', 'R'],
  hrPersonalAttendance: ['N', 'N', 'N'],
  hrRequests: ['R,U', 'R,U', 'R,U'],
  hrPayroll: ['N', 'R,U', 'N'],
  hrPayrollAdjustment: ['N', 'R,U', 'N'],
  hrPayslip: ['R', 'R', 'R'],
  hrEmployeePayslip: ['N', 'R,U', 'N'],
  approvals: ['R,U', 'R,U', 'R,U'],
  approvalsRequests: ['R,U', 'R,U', 'R,U'],
  approvalsInventoryAdjustment: ['N', 'R,U', 'R,U'],
  audit: ['N', 'R', 'R'],
  auditCopyLifecycle: ['N', 'R', 'R'],
  reports: ['N', 'R', 'N'],
  reportsRevenueExpense: ['N', 'R', 'N'],
  reportsDepositReconciliation: ['N', 'R', 'N'],
  reportsTaxDeclaration: ['N', 'R', 'N'],
  settings: ['R', 'R,U', 'R'],
  settingsRental: ['R', 'R,U', 'R'],
  settingsTiers: ['R', 'R,U', 'R'],
  settingsRbac: ['N', 'R,U', 'N'],
  settingsIntegrations: ['N', 'R,U', 'N'],
  bookSeries: ['N', 'N', 'N'],
  catalogCategories: ['R', 'R,U', 'R,U'],
  catalogSeries: ['R', 'R,U', 'R,U'],
  catalogTitles: ['R', 'R,U', 'R,U'],
  catalogTitleDetail: ['R', 'R,U', 'R,U'],
  catalogEditionDetail: ['R', 'R,U', 'R,U'],
  catalogCopyDetail: ['R', 'R,U', 'R,U'],
  suppliers: ['N', 'R,U', 'R,U'],
  stockReceipts: ['N', 'R,U', 'R,U'],
  stockOut: ['N', 'R,U', 'R,U'],
  inventoryCheck: ['N', 'R,U', 'R,U'],
  stockAlerts: ['N', 'R,U', 'R,U'],
}

const roles = ['CASHIER', 'ADMIN', 'INVENTORY_MANAGER']

test('SCREEN_POLICIES matches the accepted baseline matrix for every screen', () => {
  assert.deepEqual(Object.keys(policy.SCREEN_POLICIES).sort(), Object.keys(matrix).sort())

  for (const [screenId, expected] of Object.entries(matrix)) {
    roles.forEach((role, index) => {
      const access = policy.getBaselineAccess(screenId, role)
      assert.equal(`${access === 'U' ? 'R,U' : access}`, expected[index], `${screenId} / ${role}`)
    })
  }
})

test('access helpers and unknown policy values fail closed', () => {
  assert.equal(policy.canReadAccess('N'), false)
  assert.equal(policy.canReadAccess('R'), true)
  assert.equal(policy.canUpdateAccess('R'), false)
  assert.equal(policy.canUpdateAccess('U'), true)
  assert.equal(policy.getBaselineAccess('does-not-exist', 'ADMIN'), 'N')
  assert.equal(policy.getBaselineAccess('dashboard', null), 'N')
})

test('parent workspaces expose only readable children and aggregate Inventory POS through buyback', () => {
  assert.deepEqual(policy.getReadableChildIds('pos', 'INVENTORY_MANAGER'), ['posBuyback'])
  assert.deepEqual(
    policy.getReadableChildIds('settings', 'CASHIER'),
    ['settingsRental', 'settingsTiers'],
  )
  assert.equal(policy.getEffectiveAccess('pos', 'INVENTORY_MANAGER'), 'U')
  assert.equal(policy.getEffectiveAccess('settings', 'CASHIER'), 'R')
})

test('Admin-only screens cannot be upgraded by child aggregation and BookSeries is never a destination', () => {
  assert.equal(policy.getEffectiveAccess('settingsRbac', 'CASHIER'), 'N')
  assert.equal(policy.getEffectiveAccess('reports', 'INVENTORY_MANAGER'), 'N')
  assert.equal(policy.getFirstAllowedWorkspacePath('CASHIER'), '/dashboard')
  assert.equal(policy.getFirstAllowedWorkspacePath('ADMIN'), '/dashboard')
  assert.equal(policy.getFirstAllowedWorkspacePath('INVENTORY_MANAGER'), '/dashboard')
  assert.notEqual(policy.getFirstAllowedWorkspacePath('ADMIN'), '/book-series')
})
