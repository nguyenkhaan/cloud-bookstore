import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const routes = readFileSync(path.join(frontendRoot, 'src', 'routes', 'AppRoutes.tsx'), 'utf8')
const posRoutes = readFileSync(path.join(frontendRoot, 'src', 'features', 'pos', 'pos.route.ts'), 'utf8')
const hrRoutes = readFileSync(path.join(frontendRoot, 'src', 'features', 'hr', 'hr.route.ts'), 'utf8')
const posPage = readFileSync(path.join(frontendRoot, 'src', 'features', 'pos', 'pages', 'PosPage.tsx'), 'utf8')
const hrPage = readFileSync(path.join(frontendRoot, 'src', 'features', 'hr', 'pages', 'HumanResourcesPage.tsx'), 'utf8')

test('application routes declare each authentication path once and guard catalog screens', () => {
  assert.equal((routes.match(/path="\/verify-register"/g) ?? []).length, 1)
  for (const path of ['/catalog/series', '/catalog/titles', '/catalog/titles/:titleId', '/catalog/editions/:editionId', '/catalog/copies/:copyId']) {
    assert.match(routes, new RegExp(`path="${path}" element=\\{<RequireSession>`))
  }
})

test('phase 11 screens are guarded and feature roots redirect to their first screen', () => {
  for (const path of ['/pos/shift', '/hr/shifts', '/hr/attendance', '/hr/attendance/personal']) {
    assert.equal((routes.match(new RegExp(`path="${path}"`, 'g')) ?? []).length, 1)
    assert.match(routes, new RegExp(`path="${path}"[\\s\\S]*?<RequireSession>`))
  }

  assert.match(posRoutes, /shift: ['"]\/pos\/shift['"]|shift:/)
  assert.match(hrRoutes, /shifts: ['"]\/hr\/shifts['"]|shifts:/)
  assert.match(hrRoutes, /attendance: ['"]\/hr\/attendance['"]|attendance:/)
  assert.match(hrRoutes, /personalAttendance: ['"]\/hr\/attendance\/personal['"]|personalAttendance:/)
  assert.match(posPage, /PosWorkspacePage/)
  assert.doesNotMatch(posPage, /posPaths\.shift/)
  assert.match(hrPage, /Navigate|hrPaths\.attendance/)
  assert.doesNotMatch(posPage, /WorkspacePlaceholderPage/)
  assert.doesNotMatch(hrPage, /WorkspacePlaceholderPage/)
})

test('HR routes are unified under /hr/* with session guards and zero /admin/hr routes', () => {
  for (const path of [
    '/hr',
    '/hr/employees',
    '/hr/employees/:id',
    '/hr/shifts',
    '/hr/attendance',
    '/hr/attendance/personal',
    '/hr/requests',
    '/hr/payroll',
    '/hr/payroll/adjustments/new',
    '/hr/payslip',
    '/hr/payslip/:employeeId',
  ]) {
    assert.equal((routes.match(new RegExp(`path="${path}"`, 'g')) ?? []).length, 1)
    assert.match(routes, new RegExp(`path="${path}"[\\s\\S]*?<RequireSession>`))
  }
  assert.doesNotMatch(routes, /\/admin\/hr|adminHrPaths|AdminAttendancePage/)
})
