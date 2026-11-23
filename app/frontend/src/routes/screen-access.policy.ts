import type { AppRole } from '@/features/auth/role'

export type AccessLevel = 'N' | 'R' | 'U'
export type DataScope = 'SELF' | 'OWN_REQUESTS' | 'WAREHOUSE' | 'TRANSACTION_CONTEXT' | 'ALL'

type RoleAccessMap = Record<AppRole, AccessLevel>

export type ScreenPolicy = {
  path: string
  access: RoleAccessMap
  navId?: string
  children?: readonly string[]
  readPermissions?: readonly string[]
  updatePermissions?: readonly string[]
  protectedRoles?: readonly AppRole[]
  permissionMode: 'static' | 'api'
  maximumAccessByRole?: Partial<RoleAccessMap>
  dataScope?: DataScope
}

const access = (cashier: AccessLevel, admin: AccessLevel, inventory: AccessLevel): RoleAccessMap => ({
  CASHIER: cashier,
  ADMIN: admin,
  INVENTORY_MANAGER: inventory,
})

const readOnlyForNonAdmin = {
  CASHIER: 'R',
  ADMIN: 'U',
  INVENTORY_MANAGER: 'R',
} as const satisfies Partial<RoleAccessMap>

const employeeCatalogCeiling = {
  CASHIER: 'R',
  ADMIN: 'U',
  INVENTORY_MANAGER: 'U',
} as const satisfies Partial<RoleAccessMap>

const customerDetailCeiling = {
  CASHIER: 'R',
  ADMIN: 'U',
  INVENTORY_MANAGER: 'R',
} as const satisfies Partial<RoleAccessMap>

const policy = (
  path: string,
  screenAccess: RoleAccessMap,
  options: Omit<ScreenPolicy, 'path' | 'access' | 'permissionMode'> & {
    permissionMode?: ScreenPolicy['permissionMode']
  } = {},
): ScreenPolicy => ({
  path,
  access: screenAccess,
  ...options,
  permissionMode: options.permissionMode ?? 'static',
})

export const SCREEN_POLICIES = {
  login: policy('/login', access('N', 'N', 'N')),
  register: policy('/register', access('N', 'N', 'N')),
  verifyRegister: policy('/verify-register', access('N', 'N', 'N')),
  forgotPassword: policy('/forgot-password', access('N', 'N', 'N')),
  resetPassword: policy('/reset-password', access('N', 'N', 'N')),
  changePassword: policy('/change-password', access('U', 'U', 'U')),
  profile: policy('/profile', access('U', 'U', 'U'), { dataScope: 'SELF' }),
  dashboard: policy('/dashboard', access('R', 'R', 'R'), { navId: 'overview' }),

  pos: policy('/pos', access('U', 'U', 'N'), {
    navId: 'pos',
    children: ['posSale', 'posRental', 'posRenewal', 'posReturn', 'posBuyback'],
  }),
  posSale: policy('/pos', access('U', 'U', 'N'), { navId: 'pos.sale', dataScope: 'TRANSACTION_CONTEXT' }),
  posRental: policy('/pos', access('U', 'U', 'N'), { navId: 'pos.rental', dataScope: 'TRANSACTION_CONTEXT' }),
  posRenewal: policy('/pos', access('U', 'U', 'N'), { navId: 'pos.renewal', dataScope: 'TRANSACTION_CONTEXT' }),
  posReturn: policy('/pos', access('U', 'U', 'N'), { navId: 'pos.return', dataScope: 'TRANSACTION_CONTEXT' }),
  posBuyback: policy('/pos', access('U', 'U', 'U'), { navId: 'pos.buyback', dataScope: 'TRANSACTION_CONTEXT' }),
  posCustomerDisplay: policy('/pos/customer-display', access('R', 'R', 'N'), { navId: 'pos.customer-display' }),
  posShift: policy('/pos/shift', access('U', 'U', 'N'), { navId: 'pos.shift', dataScope: 'SELF' }),

  customers: policy('/customers', access('U', 'U', 'U'), { navId: 'customers' }),
  customerDetail: policy('/customers/:id', access('R', 'U', 'R'), {
    maximumAccessByRole: customerDetailCeiling,
  }),

  hr: policy('/hr', access('R', 'R', 'R'), {
    navId: 'hr',
    children: [
      'hrEmployees',
      'hrShifts',
      'hrAttendance',
      'hrPersonalAttendance',
      'hrRequests',
      'hrPayroll',
      'hrPayslip',
    ],
  }),
  hrEmployees: policy('/hr/employees', access('N', 'U', 'N'), { navId: 'hr.employees' }),
  hrEmployeeDetail: policy('/hr/employees/:id', access('N', 'U', 'N'), { navId: 'hr.employee-detail' }),
  hrShifts: policy('/hr/shifts', access('R', 'U', 'R'), { navId: 'hr.shifts' }),
  hrAttendance: policy('/hr/attendance', access('N', 'U', 'N'), { navId: 'hr.attendance' }),
  hrPersonalAttendance: policy('/hr/attendance/personal', access('U', 'U', 'U'), {
    navId: 'hr.personal-attendance',
    dataScope: 'SELF',
  }),
  hrRequests: policy('/hr/requests', access('U', 'U', 'U'), {
    navId: 'hr.requests',
    dataScope: 'OWN_REQUESTS',
  }),
  hrPayroll: policy('/hr/payroll', access('N', 'U', 'N'), { navId: 'hr.payroll' }),
  hrPayrollAdjustment: policy('/hr/payroll/adjustments/new', access('N', 'U', 'N'), { navId: 'hr.payroll-adjustment' }),
  hrPayslip: policy('/hr/payslip', access('R', 'R', 'R'), { navId: 'hr.payslip', dataScope: 'SELF' }),
  hrEmployeePayslip: policy('/hr/payslip/:employeeId', access('N', 'U', 'N'), { navId: 'hr.employee-payslip' }),

  approvals: policy('/approvals', access('U', 'U', 'U'), {
    navId: 'approvals',
    children: ['approvalsRequests', 'approvalsInventoryAdjustment'],
    dataScope: 'OWN_REQUESTS',
  }),
  approvalsRequests: policy('/approvals', access('U', 'U', 'U'), { navId: 'approvals.requests' }),
  approvalsInventoryAdjustment: policy('/approvals', access('N', 'U', 'U'), {
    navId: 'approvals.inventory-adjustment',
    dataScope: 'OWN_REQUESTS',
  }),

  audit: policy('/audit', access('N', 'R', 'R'), { navId: 'audit', dataScope: 'WAREHOUSE' }),
  auditCopyLifecycle: policy('/audit/copy-lifecycle', access('N', 'R', 'R'), { dataScope: 'WAREHOUSE' }),

  reports: policy('/reports', access('N', 'R', 'N'), {
    navId: 'reports',
    children: ['reportsRevenueExpense', 'reportsDepositReconciliation', 'reportsTaxDeclaration'],
    protectedRoles: ['ADMIN'],
  }),
  reportsRevenueExpense: policy('/reports/revenue-expense', access('N', 'R', 'N'), { protectedRoles: ['ADMIN'] }),
  reportsDepositReconciliation: policy('/reports/deposit-reconciliation', access('N', 'R', 'N'), { protectedRoles: ['ADMIN'] }),
  reportsTaxDeclaration: policy('/reports/tax-declaration', access('N', 'R', 'N'), { protectedRoles: ['ADMIN'] }),

  settings: policy('/settings', access('R', 'U', 'R'), {
    navId: 'settings',
    children: ['settingsRental', 'settingsTiers', 'settingsRbac', 'settingsIntegrations'],
    maximumAccessByRole: readOnlyForNonAdmin,
  }),
  settingsRental: policy('/settings/rental', access('R', 'U', 'R'), {
    navId: 'settings.rental',
    maximumAccessByRole: readOnlyForNonAdmin,
  }),
  settingsTiers: policy('/settings/tiers', access('R', 'U', 'R'), {
    navId: 'settings.tiers',
    maximumAccessByRole: readOnlyForNonAdmin,
  }),
  settingsRbac: policy('/settings/rbac', access('N', 'U', 'N'), {
    navId: 'settings.rbac',
    protectedRoles: ['ADMIN'],
  }),
  settingsIntegrations: policy('/settings/integrations', access('N', 'U', 'N'), {
    navId: 'settings.integrations',
    protectedRoles: ['ADMIN'],
  }),

  bookSeries: policy('/book-series', access('N', 'N', 'N')),

  catalogCategories: policy('/catalog/categories', access('R', 'U', 'U'), {
    navId: 'inventory.categories',
    maximumAccessByRole: employeeCatalogCeiling,
  }),
  catalogSeries: policy('/catalog/series', access('R', 'U', 'U'), {
    navId: 'inventory.series',
    maximumAccessByRole: employeeCatalogCeiling,
  }),
  catalogTitles: policy('/catalog/titles', access('R', 'U', 'U'), {
    navId: 'inventory.titles',
    permissionMode: 'api',
    readPermissions: ['BookTitles.Read'],
    updatePermissions: ['BookTitles.CreateTitle', 'BookTitles.UpdateTitle', 'BookTitles.DeleteTitle'],
    maximumAccessByRole: employeeCatalogCeiling,
  }),
  catalogTitleDetail: policy('/catalog/titles/:titleId', access('R', 'U', 'U'), {
    maximumAccessByRole: employeeCatalogCeiling,
  }),
  catalogEditionDetail: policy('/catalog/editions/:editionId', access('R', 'U', 'U'), {
    maximumAccessByRole: employeeCatalogCeiling,
  }),
  catalogCopyDetail: policy('/catalog/copies/:copyId', access('R', 'U', 'U'), {
    maximumAccessByRole: employeeCatalogCeiling,
  }),
  suppliers: policy('/suppliers', access('N', 'U', 'U'), { navId: 'warehouse.suppliers' }),
  stockReceipts: policy('/stock-receipts', access('N', 'U', 'U'), { navId: 'warehouse.stock-receipts' }),
  stockOut: policy('/stock-out', access('N', 'U', 'U'), { navId: 'warehouse.stock-out' }),
  inventoryCheck: policy('/inventory-check', access('N', 'U', 'U'), { navId: 'warehouse.inventory-check' }),
  stockAlerts: policy('/stock-alerts', access('N', 'U', 'U'), { navId: 'warehouse.stock-alerts' }),
} as const satisfies Record<string, ScreenPolicy>

export type ScreenId = keyof typeof SCREEN_POLICIES

function isRole(value: AppRole | null): value is AppRole {
  return value === 'ADMIN' || value === 'CASHIER' || value === 'INVENTORY_MANAGER'
}

export function getBaselineAccess(screenId: ScreenId | string, role: AppRole | null): AccessLevel {
  if (!isRole(role)) return 'N'
  const screenPolicy = SCREEN_POLICIES[screenId as ScreenId]
  return screenPolicy?.access[role] ?? 'N'
}

export function canReadAccess(level: AccessLevel): boolean {
  return level !== 'N'
}

export function canUpdateAccess(level: AccessLevel): boolean {
  return level === 'U'
}

export function getReadableChildIds(parentId: ScreenId | string, role: AppRole): ScreenId[] {
  const children = SCREEN_POLICIES[parentId as ScreenId]?.children ?? []
  return children.filter((childId): childId is ScreenId => canReadAccess(getBaselineAccess(childId, role)))
}

export function getEffectiveAccess(screenId: ScreenId | string, role: AppRole | null): AccessLevel {
  const directAccess = getBaselineAccess(screenId, role)
  if (directAccess !== 'N') return directAccess
  if (!isRole(role)) return 'N'

  const childAccess = getReadableChildIds(screenId, role).map((childId) => getBaselineAccess(childId, role))
  if (childAccess.includes('U')) return 'U'
  if (childAccess.includes('R')) return 'R'
  return 'N'
}

function capAccess(level: AccessLevel, maximum: AccessLevel | undefined): AccessLevel {
  if (!maximum || maximum === 'U') return level
  if (maximum === 'R' && level === 'U') return 'R'
  if (maximum === 'N') return 'N'
  return level
}

function hasPermission(permissionCodes: ReadonlySet<string>, permissions?: readonly string[]): boolean {
  return (permissions ?? []).some((code) => permissionCodes.has(code))
}

export function resolveEffectiveScreenAccess(
  screenId: ScreenId | string,
  role: AppRole | null,
  permissionCodes: ReadonlySet<string>,
  permissionStatus: 'loading' | 'ready' | 'error',
): AccessLevel {
  if (!isRole(role)) return 'N'
  const screenPolicy = SCREEN_POLICIES[screenId as ScreenId]
  if (!screenPolicy) return 'N'

  const baseline = getEffectiveAccess(screenId, role)
  const maximum = screenPolicy.maximumAccessByRole?.[role]
  if (screenPolicy.permissionMode === 'static') return capAccess(baseline, maximum)

  if (permissionStatus !== 'ready') {
    return capAccess(baseline === 'U' ? 'R' : baseline, maximum)
  }

  const canRead = hasPermission(permissionCodes, screenPolicy.readPermissions)
  const canUpdate = canRead && hasPermission(permissionCodes, screenPolicy.updatePermissions)
  return capAccess(canUpdate ? 'U' : canRead ? 'R' : 'N', maximum)
}

export function getFirstAllowedWorkspacePath(role: AppRole): string {
  const preferredScreens: ScreenId[] = ['dashboard', 'pos', 'customers', 'hr', 'settings']
  const allowedScreen = preferredScreens.find((screenId) => canReadAccess(getEffectiveAccess(screenId, role)))
  return allowedScreen ? SCREEN_POLICIES[allowedScreen].path : '/login'
}
