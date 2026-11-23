import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (...parts) => path.join(frontendRoot, 'src', ...parts)
const featureFiles = [
  ['features', 'hr', 'hr-shift.type.ts'],
  ['features', 'hr', 'attendance.data.ts'],
  ['features', 'hr', 'pages', 'AttendancePage.tsx'],
  ['features', 'hr', 'components', 'IntegratedAttendanceWorkspace.tsx'],
]

function readFeatureFile(parts) {
  return existsSync(src(...parts)) ? readFileSync(src(...parts), 'utf8') : ''
}

test('attendance page presents the integrated Figma workspace', () => {
  for (const parts of featureFiles) {
    assert.ok(existsSync(src(...parts)), `missing src/${parts.join('/')}`)
  }

  const source = featureFiles.map(readFeatureFile).join('\n')
  for (const label of ['Điểm danh ca làm', 'Kỳ công hiện tại', 'Bảng chấm công tổng thể', 'Check-in', 'Check-out', 'Không chỉnh sửa trực tiếp timestamp', 'Khóa công tháng']) {
    assert.match(source, new RegExp(label))
  }

  for (const state of ['present', 'late', 'absent', 'missing-attendance', 'adjustment-pending']) {
    assert.match(source, new RegExp(state))
  }

  assert.match(source, /Thiếu chấm công/)
  assert.match(source, /type=["']search["']/)
  assert.match(source, /currentEmployee|employeeId/)
  assert.match(source, /attendanceDemoPunchFor/)
  assert.match(source, /'Ca chiều':[\s\S]*13:05/)
  const page = readFeatureFile(['features', 'hr', 'pages', 'AttendancePage.tsx'])
  const workspace = readFeatureFile(['features', 'hr', 'components', 'IntegratedAttendanceWorkspace.tsx'])
  assert.match(workspace, /row\.employeeId === currentEmployeeId/)
  assert.match(workspace, /isAdminView \? rows : rows\.filter/)
  assert.match(workspace, /disabled=\{Boolean\(currentShift\?\.checkIn\)\}/)
  assert.match(workspace, /disabled=\{!currentShift\?\.checkIn \|\| Boolean\(currentShift\?\.checkOut\)\}/)
  assert.match(page, /IntegratedAttendanceWorkspace/)
  assert.match(page, /const isAdminView =\s*currentUser\.roleCode === 'ADMIN'/)
  assert.doesNotMatch(page, /AdminAttendanceSection|AttendanceCard|personalOnly/)
})

test('attendance UI keeps incomplete punches explicit and local', () => {
  const source = featureFiles.map(readFeatureFile).join('\n')
  assert.match(source, /Không tự suy đoán|không suy đoán|Thiếu chấm công/)
  assert.match(source, /Lý do|reason|htmlFor|aria-label/)
  assert.match(source, /disabled=\{true\}/)
  assert.doesNotMatch(source, /\.service|\.hook|axios|@tanstack\/react-query|fetch\(/)
})
