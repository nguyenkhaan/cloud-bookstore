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

test('Admin HR area keeps attendance and payroll in a separate tabbed screen', () => {
  for (const parts of [
    ['features', 'hr', 'admin-hr.route.ts'],
    ['features', 'hr', 'components', 'AdminHrTabs.tsx'],
    ['features', 'hr', 'pages', 'AdminAttendancePage.tsx'],
  ]) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  const source = [
    readSource('features', 'hr', 'admin-hr.route.ts'),
    readSource('features', 'hr', 'components', 'AdminHrTabs.tsx'),
    readSource('features', 'hr', 'pages', 'AdminAttendancePage.tsx'),
    readSource('features', 'hr', 'components', 'AttendanceFilters.tsx'),
    readSource('features', 'hr', 'components', 'AttendanceTable.tsx'),
    readSource('features', 'hr', 'components', 'AttendanceAdjustmentDialog.tsx'),
  ].join('\n')

  assert.match(source, /const adminHrRoot = ['"]\/admin\/hr['"]/)
  assert.match(source, /attendance: `\$\{adminHrRoot\}\/attendance`/)
  assert.match(source, /shifts: `\$\{adminHrRoot\}\/shifts`/)
  for (const label of ['Chấm công & lương ca', 'Phân công ca', 'Lương ca', 'Trạng thái lương ca', 'Điều chỉnh', 'AttendanceTable']) assert.match(source, new RegExp(label))
  assert.match(source, /AttendanceAdjustmentDialog/)
  assert.match(readSource('features', 'hr', 'pages', 'ShiftRecordsPage.tsx'), /roleCode\s*===\s*['"]ADMIN['"]|\['ADMIN'/)
})

test('Admin HR route declarations are session guarded', () => {
  const routes = readSource('routes', 'AppRoutes.tsx')
  for (const pathName of ['/admin/hr', '/admin/hr/attendance', '/admin/hr/shifts']) {
    assert.match(routes, new RegExp(`path="${pathName}" element=\\{<RequireSession>`))
  }
})

test('Sidebar separates employee attendance from Admin HR navigation', () => {
  const sidebar = readSource('components', 'layout', 'Sidebar', 'Sidebar.tsx')
  const workspaceRoute = readSource('features', 'workspace', 'workspace.route.ts')
  assert.match(sidebar, /id: ['"]hr['"], label: ['"]Điểm danh['"]\s*,/)
  assert.match(sidebar, /id: ['"]admin-hr['"], label: ['"]Nhân sự['"]\s*,/)
  assert.match(workspaceRoute, /['"]admin-hr['"]:\s*['"]\/admin\/hr['"]|adminHr.*\/admin\/hr/)
})
