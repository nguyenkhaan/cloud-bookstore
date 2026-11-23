import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)

function readSource(...parts) {
  return existsSync(src(...parts)) ? readFileSync(src(...parts), 'utf8') : ''
}

test('Unified /hr attendance & shifts admin management uses AdminAttendanceSection without /admin/hr', () => {
  for (const obsolete of [
    ['features', 'hr', 'admin-hr.route.ts'],
    ['features', 'hr', 'components', 'AdminHrTabs.tsx'],
    ['features', 'hr', 'pages', 'AdminAttendancePage.tsx'],
  ]) {
    assert.equal(existsSync(src(...obsolete)), false, `obsolete file should be deleted: src/${obsolete.join('/')}`)
  }

  for (const parts of [
    ['features', 'hr', 'hr.route.ts'],
    ['features', 'hr', 'components', 'AdminAttendanceSection.tsx'],
    ['features', 'hr', 'pages', 'AttendancePage.tsx'],
    ['features', 'hr', 'pages', 'ShiftRecordsPage.tsx'],
  ]) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  const attendancePage = readSource('features', 'hr', 'pages', 'AttendancePage.tsx')
  const shiftPage = readSource('features', 'hr', 'pages', 'ShiftRecordsPage.tsx')
  const adminSection = readSource('features', 'hr', 'components', 'AdminAttendanceSection.tsx')
  const source = [
    adminSection,
    readSource('features', 'hr', 'components', 'AttendanceFilters.tsx'),
    readSource('features', 'hr', 'components', 'AttendanceTable.tsx'),
    readSource('features', 'hr', 'components', 'AttendanceAdjustmentDialog.tsx'),
  ].join('\n')

  for (const label of ['Lương ca', 'Trạng thái lương ca', 'Điều chỉnh', 'AttendanceTable']) {
    assert.match(source, new RegExp(label))
  }
  assert.match(source, /AttendanceAdjustmentDialog/)
  assert.match(adminSection, /data-testid="attendance-admin-section"/)
  assert.match(attendancePage, /data-testid="attendance-employee-section"/)
  assert.match(attendancePage, /currentUser\.roleCode === 'ADMIN'/)
  assert.doesNotMatch(attendancePage, /previewRole|getPreviewRoleFromSearch|location\.search/)
  assert.match(shiftPage, /currentUser\.roleCode === 'ADMIN'/)
  assert.doesNotMatch(attendancePage, /AdminHrTabs|\/admin\/hr/)
  assert.doesNotMatch(shiftPage, /AdminHrTabs|\/admin\/hr/)
})

test('HR pages cannot elevate authorization from previewRole and admin-only routes are guarded', () => {
  const routes = readSource('routes', 'AppRoutes.tsx')
  const hrSource = [
    readSource('features', 'hr', 'pages', 'EmployeeListPage.tsx'),
    readSource('features', 'hr', 'pages', 'EmployeeDetailPage.tsx'),
    readSource('features', 'hr', 'pages', 'PayrollPage.tsx'),
    readSource('features', 'hr', 'pages', 'PayrollAdjustmentPage.tsx'),
    readSource('features', 'hr', 'pages', 'PayslipPage.tsx'),
  ].join('\n')
  assert.doesNotMatch(hrSource, /previewRole|getPreviewRoleFromSearch/)
  for (const screenId of ['hrEmployees', 'hrEmployeeDetail', 'hrPayroll', 'hrPayrollAdjustment', 'hrEmployeePayslip']) {
    assert.match(routes, new RegExp(`RoleGuard screenId="${screenId}"`))
  }
})

test('Unified /hr routes are session guarded and zero /admin/hr routes remain', () => {
  const routes = readSource('routes', 'AppRoutes.tsx')
  for (const pathName of ['/hr', '/hr/attendance', '/hr/attendance/personal', '/hr/shifts', '/hr/employees', '/hr/requests', '/hr/payroll', '/hr/payslip']) {
    assert.match(routes, new RegExp(`path="${pathName}" element=\\{<RequireSession>`))
  }
  assert.doesNotMatch(routes, /\/admin\/hr/)
})

test('Sidebar unifies HR under a single Nhân sự & tiền lương group', () => {
  const sidebar = readSource('components', 'layout', 'Sidebar', 'Sidebar.tsx')
  const workspaceRoute = readSource('features', 'workspace', 'workspace.route.ts')
  assert.match(sidebar, /id: ['"]hr['"], label: ['"]Nhân sự & tiền lương['"]\s*,/)
  assert.match(sidebar, /data-testid="sidebar-hr-submenu"/)
  assert.match(sidebar, /label: ['"]Chấm công cá nhân['"]/)
  assert.doesNotMatch(sidebar, /id: ['"]admin-hr['"]/)
  assert.doesNotMatch(sidebar, /label: ['"]Điểm danh['"]/)
  assert.match(workspaceRoute, /hr:\s*['"]\/hr['"]/)
  assert.doesNotMatch(workspaceRoute, /admin-hr|\/admin\/hr/)
})
